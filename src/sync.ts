import 'reflect-metadata';
import * as sc from './scrapper';
import * as orm from 'typeorm';
import * as winston from 'winston';
import * as sugar from 'sugar';
import { Project } from './entity/Project';
import { User } from './entity/User';
import { ProjectMember } from './entity/ProjectMember';
import { ProjectFile } from './entity/ProjectFile';
import { ProjectImage } from './entity/ProjectImage';
import { ProjectCategory } from './entity/ProjectCategory';

export const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
        winston.format.timestamp({
            alias: 'time',
            format: 'HH:mm:ss.SSS',
        }),
        winston.format.colorize(),
        winston.format.splat(),
        winston.format.simple(),
        winston.format.printf(info => {
            return sugar.Date.format(new Date(Date.now()), '{HH}:{mm}:{ss}.{SSS}') + ` ${info.level}: ${info.message}`;
        })
    ),

    transports: [
        new (winston.transports.Console)({
        }),
    ],
});

let db: orm.Connection;
let em: orm.EntityManager;
const mconn = new sc.MapsterConnection();

async function syncUser(member: sc.Member) {
    let user = await em.getRepository(User).findOne({
        username: member.name,
    });
    if (!user) {
        user = new User();
        user.username = member.name;
        user.avatarUrl = member.avatarUrl;
        await em.save(user);
    }
    return user;
}

async function syncProjectCategory(pcategory: sc.ProjectCategory) {
    let cat = await em.getRepository(ProjectCategory).findOne({
        title: pcategory.name,
    });
    if (!cat) {
        cat = new ProjectCategory();
        cat.title = pcategory.name;
        cat.iconUrl = pcategory.thumbnail;
        await em.save(cat);
    }
    return cat;
}

async function syncProject(projItem: sc.ProjectListItem) {
    logger.info(`syncing project '${projItem.name}'`);

    let project = await em.getRepository(Project).findOne({
        name: projItem.name,
    });

    if (project) {
        if (project.updatedAt >= projItem.updatedAt) {
            logger.info(`up to date`);
            return;
        }
        else {
            logger.info(`Last updated: ${project.updatedAt} ; current = ${projItem.updatedAt}`);
        }
    }

    // overview
    const rawOverview = await mconn.getProjectOverview(projItem.name);

    if (!project) {
        project = new Project();
        project.name = rawOverview.base.name;
        project.createdAt = rawOverview.createdAt;
        project.categories = [];
    }
    project.updatedAt = rawOverview.createdAt;
    project.title = rawOverview.base.title;
    project.section = rawOverview.base.rootCategory;
    project.thumbUrl = rawOverview.base.thumbnail;
    project.imageUrl = rawOverview.base.image;
    project.abandoned = rawOverview.abandoned;
    project.description = rawOverview.description.html;
    project.totalDownloads = rawOverview.totalDownloads;
    project.owner = await syncUser(rawOverview.owner);
    for (const rawCategory of rawOverview.categories) {
        if (project.categories.find(item => item.title === rawCategory.name)) continue;
        const projectCategory = await syncProjectCategory(rawCategory);
        project.categories.push(projectCategory);
    }
    await em.save(project);

    // members
    await em.getRepository(ProjectMember).delete({ project: project });
    for (const rawMember of rawOverview.members) {
        logger.debug(`processing member ${rawMember.name}`);
        let member = new ProjectMember()
        member.user = await syncUser(rawMember);
        member.role = rawMember.role;
        member.project = project;
        await em.save(member);
    }

    // files
    await em.getRepository(ProjectFile).delete({ project: project });
    for await (const rpItem of mconn.getProjectFilesList(projItem.name)) {
        logger.debug(`processing file ${rpItem.title} (${rpItem.id})`);
        const rfullItem = await mconn.getProjectFile(projItem.name, rpItem.id);

        let projectFile = new ProjectFile();
        projectFile.originalId = rfullItem.id;
        projectFile.createdAt = rfullItem.updatedAt;
        projectFile.filename = rfullItem.filename;
        projectFile.downloadUrl = rfullItem.downloadUrl;
        projectFile.cdnUrl = rfullItem.cdnUrl;
        projectFile.md5 = rfullItem.md5;
        projectFile.downloadsCount = rfullItem.downloads;
        projectFile.description = rfullItem.description.html;
        projectFile.size = rfullItem.sizeBytes;
        projectFile.uploader = await syncUser(rfullItem.uploadedBy);
        projectFile.project = project;
        await em.save(projectFile);
    }

    // images
    await em.getRepository(ProjectImage).delete({ project: project });
    for (const rwImage of (await mconn.getProjectImages(projItem.name)).images) {
        logger.debug(`processing image ${rwImage.label}`);
        let image = new ProjectImage();
        image.label = rwImage.label;
        image.caption = rwImage.caption;
        image.thumbUrl = rwImage.thumbnailUrl;
        image.imageUrl = rwImage.imageUrl;
        image.project = project;
        await em.save(image);
    }

    project.updatedAt = rawOverview.updatedAt;
    await em.save(project);
}

process.on('unhandledRejection', e => { throw e; });
(async function() {
    logger.debug('Setting up browser');
    await mconn.setup({ logger: logger });

    logger.debug('Connecting to DB..');
    db = await orm.createConnection();
    em = orm.getManager();

    const pageReporter: sc.PaginationHandler<sc.ProjectListItem> = (pageInfo, results) => {
        logger.info(`Page [${pageInfo.current.toString().padEnd(3)}/${pageInfo.total.toString().padEnd(3)}]`);
        return true;
    }

    for await (const pitem of mconn.getProjectsList(sc.ProjectSectionsList.maps, pageReporter)) {
        await syncProject(pitem);
    }
    for await (const pitem of mconn.getProjectsList(sc.ProjectSectionsList.assets, pageReporter)) {
        await syncProject(pitem);
    }

    await db.close();
})();
