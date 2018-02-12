/// <reference types="cheerio" />
import { ProjectOverview, ProjectFile } from './scrapper/project';
export declare function get(p: string): Promise<CheerioStatic>;
export declare function getProjectFile(projectName: string, fileId: number): Promise<ProjectFile>;
export declare function getLatestProjectFiles(projectName: string, since?: Date): Promise<ProjectFile[]>;
export declare function getProject(projectName: string): Promise<ProjectOverview>;
export declare function getLatestProjects(rootCategory: 'maps' | 'assets', since?: Date): Promise<ProjectOverview[]>;
export { ProjectOverview, ProjectFile } from './scrapper/project';
