import * as cheerio from 'cheerio';
import * as request from 'request-promise';
import * as url from 'url';
import { ProjectOverview, ProjectOverviewScrapper, ProjectFilelistScrapper, ProjectFileScrapper, ProjectListItemScrapper, ProjectFile, ForumPost, ForumThread, ForumThreadScrapper, ProjectImageScrapper, ProjectImageItem } from './scrapper/project';
import * as stringSimilarity from 'string-similarity';

export async function get(p: string) {
    return <CheerioStatic>await request.get('https://www.sc2mapster.com' + p, {
        transform: (body, response) => {
            if (response.statusCode !== 200) throw new Error(`HTTP code: ${response.statusCode}`);
            return cheerio.load(body);
        },
    });
}

export async function getProjectFile(projectName: string, fileId: number) {
    return (new ProjectFileScrapper()).process(await get(`/projects/${projectName}/files/${fileId}`));
}

export async function getLatestProjectFiles(projectName: string, since?: Date) {
    let items = (new ProjectFilelistScrapper()).process(await get(`/projects/${projectName}/files`));
    if (since) {
        items = items.filter((item) => {
            return item.updatedAt > since;
        });
    }
    const results = <ProjectFile[]>[];
    for (const item of items) {
        results.push(await getProjectFile(projectName, item.id));
    }
    return results;
}

export async function getProject(projectName: string) {
    return (new ProjectOverviewScrapper()).process(await get(`/projects/${projectName}`));
}

export async function getLatestProjects(rootCategory: 'maps' | 'assets', since?: Date) {
    let items = (new ProjectListItemScrapper()).process(await get('/' + rootCategory + '?filter-sort=updated'));
    if (since) {
        items = items.filter((item) => {
            return item.updatedAt > since;
        });
    }
    const results = <ProjectOverview[]>[];
    for (const item of items) {
        results.push(await getProject(item.name));
    }
    return results;
}

export async function getProjectImages(projectName: string) {
    return (new ProjectImageScrapper()).process(await get(`/projects/${projectName}/images`));
}

export function findMatchingFileImage(label: string, images: ProjectImageItem[]) {
    const imMap = new Map<string, ProjectImageItem>();
    images.forEach((value => {
        imMap.set(value.label, value);
    }));

    const match = stringSimilarity.findBestMatch(label, Array.from(imMap.keys()));

    if (match.bestMatch.rating < 0.6) return null;

    return imMap.get(match.bestMatch.target);
}

export async function getForumThread(threadUrl: string) {
    const uinfo = url.parse(threadUrl);
    const r = (new ForumThreadScrapper()).process(await get(uinfo.path));
    r.url = threadUrl;
    return r;
}

export { ProjectOverview, ProjectFile, ProjectImagePage, ForumThread, ForumPost } from './scrapper/project';
