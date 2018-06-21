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
        winston.format.timestamp({}),
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

async function syncProject(projectName: string) {
    logger.info(`syncing project '${projectName}'`);

    let project = await em.getRepository(Project).findOne({
        name: projectName,
    }, {
        relations: ['members', 'files', 'images']
    });
    if (project) {
        logger.info(`already exists`);
        return;
    }

    // overview
    const rawOverview = await mconn.getProjectOverview(projectName);
    if (!project) {
        project = new Project();
        project.name = rawOverview.base.name;
        project.createdAt = rawOverview.createdAt;
        project.categories = [];
        project.members = [];
        project.files = [];
        project.images = [];
    }
    project.updatedAt = rawOverview.updatedAt;
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
    for (const rawMember of rawOverview.members) {
        if (project.members.find(item => item.user.username === rawMember.name)) continue;
        logger.debug(`processing member ${rawMember.name}`);
        let member = new ProjectMember()
        member.user = await syncUser(rawMember);
        member.role = rawMember.role;
        member.project = project;
        project.members.push(member);
        await em.save(member);
    }

    // files
    for await (const rpItem of await mconn.getProjectFilesList(projectName)) {
        if (project.files.find(item => item.originalId === rpItem.id)) continue;
        logger.debug(`processing file ${rpItem.title} (${rpItem.id})`);
        const rfullItem = await mconn.getProjectFile(projectName, rpItem.id);

        let projectFile = new ProjectFile();
        projectFile.originalId = rfullItem.id;
        projectFile.createdAt = rfullItem.updatedAt;
        projectFile.filename = rfullItem.filename;
        projectFile.md5 = rfullItem.md5;
        projectFile.downloadsCount = rfullItem.downloads;
        projectFile.description = rfullItem.description.html;
        projectFile.size = rfullItem.sizeBytes;
        projectFile.uploader = await syncUser(rfullItem.uploadedBy);
        projectFile.project = project;
        project.files.push(projectFile);
        await em.save(projectFile);
    }

    // images
    for (const rwImage of (await mconn.getProjectImages(projectName)).images) {
        if (project.images.find(item => item.imageUrl === rwImage.imageUrl)) continue;
        logger.debug(`processing image ${rwImage.label}`);
        let image = new ProjectImage();
        image.label = rwImage.label;
        image.caption = rwImage.caption;
        image.thumbUrl = rwImage.thumbnailUrl;
        image.imageUrl = rwImage.imageUrl;
        image.project = project;
        project.images.push(image);
        await em.save(image);
    }

    await em.save(project);
}

(async function() {
    logger.debug('Connecting to DB..');
    db = await orm.createConnection();
    em = orm.getManager();
    // const r = await syncProject('starcraft-mass-recall');
    for await (const pitem of mconn.getProjectsList(sc.ProjectSections.Maps)) {
        await syncProject(pitem.name);
    }
    await db.close();
})();
