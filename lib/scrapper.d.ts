/// <reference types="cheerio" />
export declare type PaginationStatus = {
    current: number;
    total: number;
};
export declare enum ProjectSections {
    Assets = "assets",
    Maps = "maps",
}
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
};
export declare type ProjectFile = ProjectFileItem & {
    base: ProjectBasicInfo;
    filename: string;
    downloads: number;
    size: string;
    sizeBytes: number;
    md5: string;
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
export declare type ForumPost = {
    date: Date;
    author: Member;
    content: WysiwygContent;
};
export declare type ForumThread = {
    url: string;
    title: string;
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
export declare type PaginationHandler<T> = (pageInfo: PaginationStatus, results: T[]) => boolean;
export declare class MapsterConnection {
    private get(p);
    getProjectsList(section: ProjectSections, pageHandler?: PaginationHandler<ProjectListItem>): AsyncIterableIterator<ProjectListItem>;
    getProjectOverview(projectName: string): Promise<ProjectOverview>;
    getProjectFilesList(projectName: string): AsyncIterableIterator<ProjectFileItem>;
    getProjectFile(projectName: string, fileId: number): Promise<ProjectFile>;
    getProjectImages(projectName: string): Promise<ProjectImagePage>;
    getForumThread(threadUrl: string): Promise<ForumThread>;
}
