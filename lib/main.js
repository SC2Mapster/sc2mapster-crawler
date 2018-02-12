"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cheerio = require("cheerio");
const request = require("request-promise");
const project_1 = require("./scrapper/project");
async function get(p) {
    return await request.get('https://www.sc2mapster.com' + p, {
        transform: (body, response) => {
            if (response.statusCode !== 200)
                throw new Error(`HTTP code: ${response.statusCode}`);
            return cheerio.load(body);
        },
    });
}
exports.get = get;
async function getProjectFile(projectName, fileId) {
    return (new project_1.ProjectFileScrapper()).process(await get(`/projects/${projectName}/files/${fileId}`));
}
exports.getProjectFile = getProjectFile;
async function getLatestProjectFiles(projectName, since) {
    let items = (new project_1.ProjectFilelistScrapper()).process(await get(`/projects/${projectName}/files`));
    if (since) {
        items = items.filter((item) => {
            return item.updatedAt > since;
        });
    }
    const results = [];
    for (const item of items) {
        results.push(await getProjectFile(projectName, item.id));
    }
    return results;
}
exports.getLatestProjectFiles = getLatestProjectFiles;
async function getProject(projectName) {
    return (new project_1.ProjectOverviewScrapper()).process(await get(`/projects/${projectName}`));
}
exports.getProject = getProject;
async function getLatestProjects(rootCategory, since) {
    let items = (new project_1.ProjectListItemScrapper()).process(await get('/' + rootCategory + '?filter-sort=updated'));
    if (since) {
        items = items.filter((item) => {
            return item.updatedAt > since;
        });
    }
    const results = [];
    for (const item of items) {
        results.push(await getProject(item.name));
    }
    return results;
}
exports.getLatestProjects = getLatestProjects;
//# sourceMappingURL=main.js.map