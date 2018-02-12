/// <reference types="cheerio" />
export declare class ScrapperRegistry {
}
export declare type ScrapperOptions = {
    pathRegex: RegExp;
};
export declare abstract class ScrapperBase {
    protected options: ScrapperOptions;
    constructor(options: ScrapperOptions);
    matchUrl(url: string): boolean;
}
export declare type WysiwygContent = {
    html: string;
    simplified: string;
    embeddedImages: string[];
};
export declare type Member = {
    name: string;
    title: string;
    profileThumbUrl?: string;
};
export declare type MemberWithRole = Member & {
    role: string;
};
export declare function parseEmbeddedImages($el: Cheerio): string[];
export declare function parseWysiwygContent($el: Cheerio): WysiwygContent;
export declare type ProjectListItem = {
    name: string;
    title: string;
    updatedAt: Date;
};
export declare class ProjectListItemScrapper extends ScrapperBase {
    constructor();
    process($: CheerioStatic): ProjectListItem[];
}
export declare type ProjectCategory = {
    name: string;
    thumbnail: string;
};
export declare type ProjectOverview = {
    id: number;
    name: string;
    title: string;
    rootCategory: string;
    image?: string;
    thumbnail?: string;
    categories: ProjectCategory[];
    description: WysiwygContent;
    createdAt: Date;
    updatedAt: Date;
    totalDownloads: number;
    owner: MemberWithRole;
    members: MemberWithRole[];
};
export declare class ProjectOverviewScrapper extends ScrapperBase {
    constructor();
    process($: CheerioStatic): ProjectOverview;
}
export declare type ProjectFileItem = {
    id: number;
    updatedAt: Date;
    title: string;
};
export declare class ProjectFilelistScrapper extends ScrapperBase {
    constructor();
    process($: CheerioStatic): ProjectFileItem[];
}
export declare type ProjectFile = ProjectFileItem & {
    projectName: string;
    filename: string;
    downloads: number;
    size: string;
    description: WysiwygContent;
    uploadedBy: Member;
};
export declare class ProjectFileScrapper extends ScrapperBase {
    constructor();
    process($: CheerioStatic): ProjectFile;
}
