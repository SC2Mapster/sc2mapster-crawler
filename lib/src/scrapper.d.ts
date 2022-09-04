/// <reference types="cheerio" />
import * as winston from 'winston';
import puppeteer from 'puppeteer';
export declare const mBaseURL = "https://www.sc2mapster.com";
export declare type PaginationStatus = {
    current: number;
    total: number;
};
export declare enum ProjectSectionsList {
    assets = "assets",
    maps = "maps"
}
export declare type ProjectSection = keyof typeof ProjectSectionsList | string[];
export declare type WysiwygContent = {
    html: string;
    simplified: string;
    embeddedImages: string[];
};
export declare type Member = {
    name: string;
    title: string;
    avatarUrl?: string;
    profileThumbUrl?: string;
};
export declare type MemberWithRole = Member & {
    role: string;
};
export declare type ProjectCategory = {
    name: string;
    thumbnail: string;
};
export declare type ProjectListItem = {
    name: string;
    title: string;
    updatedAt: Date;
};
export declare type ProjectBasicInfo = {
    name: string;
    title: string;
    rootCategory: string;
    image?: string;
    thumbnail?: string;
};
export declare type ProjectOverview = {
    id: number;
    base: ProjectBasicInfo;
    abandoned: boolean;
    categories: ProjectCategory[];
    description: WysiwygContent;
    createdAt: Date;
    updatedAt: Date;
    totalDownloads: number;
    owner: MemberWithRole;
    members: MemberWithRole[];
};
export declare type ProjectFileItem = {
    id: number;
    updatedAt: Date;
    title: string;
    downloadUrl: string;
};
export declare type ProjectFile = ProjectFileItem & {
    base: ProjectBasicInfo;
    filename: string;
    downloads: number;
    size: string;
    sizeBytes: number;
    md5: string;
    cdnUrl: string;
    description: WysiwygContent;
    uploadedBy: Member;
};
export declare type ProjectImageItem = {
    label: string;
    caption: string;
    imageUrl: string;
    thumbnailUrl: string;
};
export declare type ProjectImagePage = {
    base: ProjectBasicInfo;
    images: ProjectImageItem[];
};
export declare type ForumThreadBasic = {
    threadId: number;
    title: string;
    directLink: string;
    categoryBreadcrumb?: string[];
};
export declare type ForumThreadItem = ForumThreadBasic & {
    createdAt: Date;
    lastPostedAt: Date;
    postedBy: Member;
    pages: number;
    replies: number;
    views: number;
};
export declare type ForumPost = {
    thread: ForumThreadBasic;
    postNumber: number;
    date: Date;
    author: Member;
    content: WysiwygContent;
    directLink: string;
};
export declare type ForumThread = {
    url: string;
    title: string;
    directLink: string;
    posts: ForumPost[];
    categoryBreadcrumb: string[];
};
export declare function parsePager($: Cheerio): PaginationStatus;
export declare function parseEmbeddedImages($el: Cheerio): string[];
export declare function parseWysiwygContent($el: Cheerio): WysiwygContent;
export declare function parseProjectsList($: Cheerio): ProjectListItem[];
export declare function parseProjectFilesList($: Cheerio): ProjectFileItem[];
export declare function parseProjectFile($: Cheerio): ProjectFile;
export declare function parseProjectImage($: Cheerio): ProjectImagePage;
export interface MapsterConnOpts {
    captcha2Token?: string;
    logger?: winston.Logger;
    userAgent?: string;
}
export declare type PaginationHandler<T> = (pageInfo: PaginationStatus, results: T[]) => boolean;
export declare let mBrowser: puppeteer.Browser;
export declare class MapsterConnection {
    protected cpage: puppeteer.Page;
    protected logger: winston.Logger;
    setup(opts?: MapsterConnOpts): Promise<void>;
    close(): Promise<void>;
    private get;
    getProjectsList(section: ProjectSection, pageHandler?: PaginationHandler<ProjectListItem>): AsyncGenerator<ProjectListItem, void, undefined>;
    getProjectOverview(projectName: string): Promise<ProjectOverview>;
    getProjectFilesList(projectName: string, pageHandler?: PaginationHandler<ProjectFileItem>): AsyncGenerator<ProjectFileItem, void, undefined>;
    getProjectFile(projectName: string, fileId: number): Promise<ProjectFile>;
    getProjectImages(projectName: string): Promise<ProjectImagePage>;
    getForumRecent(): Promise<ForumThreadItem[]>;
    getForumThread(cpath: string): Promise<ForumThread>;
    getForumPostList(cpath: string, pageHandler?: PaginationHandler<ForumPost>, opts?: {
        pFrom: number;
        pTo: number;
    }): AsyncGenerator<ForumPost, void, undefined>;
}
