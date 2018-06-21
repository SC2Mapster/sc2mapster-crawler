"use strict";
var __asyncValues = (this && this.__asyncIterator) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator];
    return m ? m.call(o) : typeof __values === "function" ? __values(o) : o[Symbol.iterator]();
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const sc = require("./scrapper");
const orm = require("typeorm");
const winston = require("winston");
const sugar = require("sugar");
const Project_1 = require("./entity/Project");
const User_1 = require("./entity/User");
const ProjectMember_1 = require("./entity/ProjectMember");
const ProjectFile_1 = require("./entity/ProjectFile");
const ProjectImage_1 = require("./entity/ProjectImage");
const ProjectCategory_1 = require("./entity/ProjectCategory");
exports.logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(winston.format.timestamp({}), 
    // winston.format.prettyPrint(),
    winston.format.colorize(), winston.format.splat(), winston.format.simple(), winston.format.printf(info => {
        // return `${info.timestamp} ${info.level}: ${info.message}`;
        return sugar.Date.format(new Date(Date.now()), '{HH}:{mm}:{ss}.{SSS}') + ` ${info.level}: ${info.message}`;
    })),
    transports: [
        new (winston.transports.Console)({}),
    ],
});
let db;
let em;
const mconn = new sc.MapsterConnection();
async function syncUser(member) {
    let user = await em.getRepository(User_1.User).findOne({
        username: member.name,
    });
    if (!user) {
        user = new User_1.User();
        user.username = member.name;
        user.avatarUrl = member.avatarUrl;
        await em.save(user);
    }
    return user;
}
async function syncProjectCategory(pcategory) {
    let cat = await em.getRepository(ProjectCategory_1.ProjectCategory).findOne({
        title: pcategory.name,
    });
    if (!cat) {
        cat = new ProjectCategory_1.ProjectCategory();
        cat.title = pcategory.name;
        cat.iconUrl = pcategory.thumbnail;
        await em.save(cat);
    }
    return cat;
}
async function syncProject(projectName) {
    exports.logger.info(`syncing project '${projectName}'`);
    let project = await em.getRepository(Project_1.Project).findOne({
        name: projectName,
    });
    if (project) {
        exports.logger.info(`already exists`);
        return;
    }
    // overview
    const rawOverview = await mconn.getProjectOverview(projectName);
    if (!project) {
        project = new Project_1.Project();
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
        const projectCategory = await syncProjectCategory(rawCategory);
        project.categories.push(projectCategory);
    }
    await em.save(project);
    // members
    for (const rawMember of rawOverview.members) {
        exports.logger.debug(`processing member ${rawMember.name}`);
        let member = new ProjectMember_1.ProjectMember();
        member.user = await syncUser(rawMember);
        member.role = rawMember.role;
        member.project = project;
        project.members.push(member);
        await em.save(member);
    }
    // files
    const rawFiles = [];
    try {
        for (var _a = __asyncValues(await mconn.getProjectFilesList(projectName)), _b; _b = await _a.next(), !_b.done;) {
            const rpItem = await _b.value;
            exports.logger.debug(`processing file ${rpItem.title} (${rpItem.id})`);
            const rfullItem = await mconn.getProjectFile(projectName, rpItem.id);
            rawFiles.push(rfullItem);
            let projectFile = new ProjectFile_1.ProjectFile();
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
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_b && !_b.done && (_c = _a.return)) await _c.call(_a);
        }
        finally { if (e_1) throw e_1.error; }
    }
    try {
        // images
        for (var _d = __asyncValues((await mconn.getProjectImages(projectName)).images), _e; _e = await _d.next(), !_e.done;) {
            const rwImage = await _e.value;
            exports.logger.debug(`processing image ${rwImage.label}`);
            let image = new ProjectImage_1.ProjectImage();
            image.label = rwImage.label;
            image.caption = rwImage.caption;
            image.thumbUrl = rwImage.thumbnailUrl;
            image.imageUrl = rwImage.imageUrl;
            image.project = project;
            project.images.push(image);
            await em.save(image);
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_e && !_e.done && (_f = _d.return)) await _f.call(_d);
        }
        finally { if (e_2) throw e_2.error; }
    }
    // save
    await em.save(project);
    var e_1, _c, e_2, _f;
    // return {
    //     overview: await mconn.getProjectOverview(projectName),
    //     files: files,
    //     images: (await mconn.getProjectImages(projectName)).images,
    // };
}
(async function () {
    exports.logger.debug('Connecting to DB..');
    db = await orm.createConnection();
    em = orm.getManager();
    const r = await syncProject('first-contact');
    console.log(r);
    await db.close();
})();
//# sourceMappingURL=sync.js.map