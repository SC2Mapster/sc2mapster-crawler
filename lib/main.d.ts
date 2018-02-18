/// <reference types="cheerio" />
import { ProjectOverview, ProjectFile, ForumThread, ProjectImageItem } from './scrapper/project';
export declare function get(p: string): Promise<CheerioStatic>;
export declare function getProjectFile(projectName: string, fileId: number): Promise<ProjectFile>;
export declare function getLatestProjectFiles(projectName: string, since?: Date): Promise<ProjectFile[]>;
export declare function getProject(projectName: string): Promise<ProjectOverview>;
export declare function getLatestProjects(rootCategory: 'maps' | 'assets', since?: Date): Promise<ProjectOverview[]>;
export declare function getProjectImages(projectName: string): Promise<{
    base: {
        name: string;
        title: string;
        rootCategory: string;
        image?: string;
        thumbnail?: string;
    };
    images: ProjectImageItem[];
}>;
export declare function findMatchingFileImage(label: string, images: ProjectImageItem[]): ProjectImageItem;
export declare function getForumThread(threadUrl: string): Promise<ForumThread>;
export { ProjectOverview, ProjectFile, ProjectImagePage, ForumThread, ForumPost } from './scrapper/project';
