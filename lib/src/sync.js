"use strict";
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const sc = __importStar(require("./scrapper"));
const orm = __importStar(require("typeorm"));
const winston = __importStar(require("winston"));
const sugar = __importStar(require("sugar"));
const Project_1 = require("./entity/Project");
const User_1 = require("./entity/User");
const ProjectMember_1 = require("./entity/ProjectMember");
const ProjectFile_1 = require("./entity/ProjectFile");
const ProjectImage_1 = require("./entity/ProjectImage");
const ProjectCategory_1 = require("./entity/ProjectCategory");
exports.logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(winston.format.timestamp({
        alias: 'time',
        format: 'HH:mm:ss.SSS',
    }), winston.format.colorize(), winston.format.splat(), winston.format.simple(), winston.format.printf(info => {
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
async function syncProject(projItem) {
    var e_1, _a;
    exports.logger.info(`syncing project '${projItem.name}'`);
    let project = await em.getRepository(Project_1.Project).findOne({
        name: projItem.name,
    });
    if (project) {
        if (project.updatedAt >= projItem.updatedAt) {
            exports.logger.info(`up to date`);
            return;
        }
        else {
            exports.logger.info(`Last updated: ${project.updatedAt} ; current = ${projItem.updatedAt}`);
        }
    }
    // overview
    const rawOverview = await mconn.getProjectOverview(projItem.name);
    if (!project) {
        project = new Project_1.Project();
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
        if (project.categories.find(item => item.title === rawCategory.name))
            continue;
        const projectCategory = await syncProjectCategory(rawCategory);
        project.categories.push(projectCategory);
    }
    await em.save(project);
    // members
    await em.getRepository(ProjectMember_1.ProjectMember).delete({ project: project });
    for (const rawMember of rawOverview.members) {
        exports.logger.debug(`processing member ${rawMember.name}`);
        let member = new ProjectMember_1.ProjectMember();
        member.user = await syncUser(rawMember);
        member.role = rawMember.role;
        member.project = project;
        await em.save(member);
    }
    // files
    await em.getRepository(ProjectFile_1.ProjectFile).delete({ project: project });
    try {
        for (var _b = __asyncValues(mconn.getProjectFilesList(projItem.name)), _c; _c = await _b.next(), !_c.done;) {
            const rpItem = _c.value;
            exports.logger.debug(`processing file ${rpItem.title} (${rpItem.id})`);
            const rfullItem = await mconn.getProjectFile(projItem.name, rpItem.id);
            let projectFile = new ProjectFile_1.ProjectFile();
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
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) await _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
    // images
    await em.getRepository(ProjectImage_1.ProjectImage).delete({ project: project });
    for (const rwImage of (await mconn.getProjectImages(projItem.name)).images) {
        exports.logger.debug(`processing image ${rwImage.label}`);
        let image = new ProjectImage_1.ProjectImage();
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
(async function () {
    var e_2, _a, e_3, _b;
    exports.logger.debug('Setting up browser');
    await mconn.setup({ logger: exports.logger });
    exports.logger.debug('Connecting to DB..');
    db = await orm.createConnection();
    em = orm.getManager();
    const pageReporter = (pageInfo, results) => {
        exports.logger.info(`Page [${pageInfo.current.toString().padEnd(3)}/${pageInfo.total.toString().padEnd(3)}]`);
        return true;
    };
    try {
        for (var _c = __asyncValues(mconn.getProjectsList(sc.ProjectSectionsList.maps, pageReporter)), _d; _d = await _c.next(), !_d.done;) {
            const pitem = _d.value;
            await syncProject(pitem);
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c.return)) await _a.call(_c);
        }
        finally { if (e_2) throw e_2.error; }
    }
    try {
        for (var _e = __asyncValues(mconn.getProjectsList(sc.ProjectSectionsList.assets, pageReporter)), _f; _f = await _e.next(), !_f.done;) {
            const pitem = _f.value;
            await syncProject(pitem);
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (_f && !_f.done && (_b = _e.return)) await _b.call(_e);
        }
        finally { if (e_3) throw e_3.error; }
    }
    await db.close();
})();
//# sourceMappingURL=sync.js.map