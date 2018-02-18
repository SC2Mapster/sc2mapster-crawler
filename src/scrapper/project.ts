import * as cheerio from 'cheerio';

// TODO: simplify: single scrapper instance should be capable of handling multiple pages/sections

export class ScrapperRegistry {
}

export type ScrapperOptions = {
    pathRegex: RegExp;
};

export abstract class ScrapperBase {
    protected options: ScrapperOptions;

    constructor(options: ScrapperOptions) {
        this.options = options;
    }

    public matchUrl(url: string) {
        const base = /^https?:\/\/(?:www\.)?sc2mapster\.com(\/?.*)$/;
        const r = base.exec(url);
        if (!r) return false;
        return true;
    }
}

//
//

export type WysiwygContent = {
    html: string;
    simplified: string;
    embeddedImages: string[];
};

export type Member = {
    name: string;
    title: string;
    profileThumbUrl?: string;
};

export type MemberWithRole = Member & {
    role: string;
};

function parseDetails($elements: Cheerio) {
    let detailsMap = new Map<string, Cheerio>();
    $elements.each((index, el) => {
        const $ = cheerio.load(el);
        detailsMap.set($('.info-label').text().trim(), $('.info-data'));
    });
    return detailsMap;
}

function parseDate($el: Cheerio) {
    return new Date(Number($el.find('abbr').data('epoch')) * 1000);
}

function parseMember($el: Cheerio) {
    const m = <Member>{};
    let $username: Cheerio;
    if ($el.hasClass('p-comment-user')) {
        $username = $el.find('.p-comment-username a')
        m.title = $username.find('span.user').text().trim();
    }
    else {
        $username = $el.hasClass('user-tag-large') ? $el.find('.info-wrapper a') : $el.find('>a');
        m.title = $username.text().trim();
    }
    m.name = $username.attr('href').match(/^\/members\/([\w-]+)$/i)[1];
    const $avatar = $el.find('.avatar');
    if ($avatar) {
        m.profileThumbUrl = $avatar.find('img').attr('src');
    }
    return m;
}

function parseMemberWithRole($el: Cheerio) {
    const m = <MemberWithRole>parseMember($el);
    m.role = $el.find('.info-wrapper .title').text().trim();
    return m;
}

export function parseEmbeddedImages($el: Cheerio): string[] {
    const l = <string[]>[];
    $el.find('img[src]').each((index, el) => {
        const src = el.attribs['src'];
        if (/^https?:\/\/(?:www\.)?sc2mapster\.com\/thumbman\//.exec(src)) return;
        l.push(src);
    });
    return l;
}

export function parseWysiwygContent($el: Cheerio) {
    const cnt = <WysiwygContent>{};
    cnt.html = $el.html().trim();
    cnt.simplified = $el.text().trim().replace(/\s+/g, ' ');
    cnt.embeddedImages = parseEmbeddedImages($el);
    return cnt;
}

//
//

export type ProjectListItem = {
    name: string;
    title: string;
    updatedAt: Date;
};

export class ProjectListItemScrapper extends ScrapperBase {
    constructor() {
        super({
            pathRegex: /^\/(?:projects|maps)$/,
        });
        // ?filter-sort=updated
    }

    public process($: CheerioStatic) {
        const fitems: ProjectListItem[] = [];
        const $items = $('.project-listing li.project-list-item');
        $items.each((index, el) => {
            const pfile = <ProjectListItem>{};
            const $el = $(el);
            pfile.name = /^\/projects\/([\w-]+)$/i.exec($el.find('.info.name a').attr('href'))[1];
            pfile.title = $el.find('.info.name a').text().trim();
            pfile.updatedAt = parseDate($el.find('.e-update-date'));
            fitems.push(pfile);
        });
        return fitems;
    }
}

//
//

export type ProjectCategory = {
    name: string;
    thumbnail: string;
};

export type ProjectBasicInfo = {
    name: string;
    title: string;
    rootCategory: string;
    image?: string;
    thumbnail?: string;
};

export type ProjectOverview = {
    id: number;
    base: ProjectBasicInfo;
    categories: ProjectCategory[];
    description: WysiwygContent;
    createdAt: Date;
    updatedAt: Date;
    totalDownloads: number;
    owner: MemberWithRole;
    members: MemberWithRole[];
};

function parseProjectBasic($: Cheerio) {
    const pinfo = <ProjectBasicInfo>{};
    pinfo.title = $.find('h1.project-title').text().trim();
    pinfo.name = $.find('h1.project-title a').attr('href').match(/^\/projects\/([\w-]+)$/i)[1];
    pinfo.rootCategory = $.find('h2.RootGameCategory a').text().trim();

    const $projectAvatar = $.find('.avatar-wrapper a');
    if ($projectAvatar.length) {
        pinfo.image = $projectAvatar.attr('href');
        pinfo.thumbnail = $projectAvatar.find('img').attr('src');
    }
    return pinfo;
}

export class ProjectOverviewScrapper extends ScrapperBase {
    constructor() {
        super({
            pathRegex: /^\/(?:projects|maps)\/([\w-]+)$/i,
        });
    }

    public process($: CheerioStatic): ProjectOverview {
        let project = <ProjectOverview>{};

        project.base = parseProjectBasic($('.project-details-container'));

        project.description = parseWysiwygContent($('.project-description'));

        // <meta property="og:description" content

        const detailsMap = parseDetails($('.e-project-details-secondary ul.project-details li'));

        project.id = Number(detailsMap.get('Project ID').text());
        project.createdAt = parseDate(detailsMap.get('Created'));
        project.updatedAt = detailsMap.get('Last Released File').text().trim() !== 'Never' ? parseDate(detailsMap.get('Last Released File')) : project.createdAt;
        project.totalDownloads = Number(detailsMap.get('Total Downloads').text().replace(',', ''));

        project.categories = [];
        const $categories = $('.e-project-details-secondary .project-categories >li');
        $categories.each((index, el) => {
            project.categories.push({
                name: $categories.eq(index).find('a').attr('title'),
                thumbnail: $categories.eq(index).find('img').attr('src'),
            });
        });

        project.members = [];
        const $members = $('.e-project-details-secondary .project-members li.user-tag-large');
        $members.each((index, el) => {
            project.members.push(parseMemberWithRole($members.eq(index)));
            if (!project.owner) {
                project.owner = project.members[0];
            }
        });

        return project;
    }
}

//
//

export type ProjectFileItem = {
    id: number;
    updatedAt: Date;
    title: string;
};

export class ProjectFilelistScrapper extends ScrapperBase {
    constructor() {
        super({
            pathRegex: /^\/projects\/([\w-]+)\/files$/,
        });
    }

    public process($: CheerioStatic): ProjectFileItem[] {
        const fitems: ProjectFileItem[] = [];
        const $items = $('table.project-file-listing tr.project-file-list-item');
        $items.each((index, el) => {
            const pfile = <ProjectFileItem>{};
            const $el = $(el);
            pfile.id = Number(/files\/([0-9]+)$/.exec($el.find('.project-file-name-container a').attr('href'))[1]);
            pfile.title = $el.find('.project-file-name-container a').data('name');
            pfile.updatedAt = parseDate($el.find('.project-file-date-uploaded'));
            fitems.push(pfile);
        });
        return fitems;
    }
}

//
//

export type ProjectFile = ProjectFileItem & {
    base: ProjectBasicInfo;
    filename: string;
    downloads: number;
    size: string;
    description: WysiwygContent;
    uploadedBy: Member;
};

export class ProjectFileScrapper extends ScrapperBase {
    constructor() {
        super({
            pathRegex: /^\/projects\/([\w-]+)\/files\/([0-9]+)$/,
        });
    }

    public process($: CheerioStatic) {
        const pfile = <ProjectFile>{};

        pfile.base = parseProjectBasic($('.project-details-container'));

        pfile.title = $('.details-header h3').text().trim();
        pfile.id = Number($('.project-file-download-button-large a').attr('href').match(/^\/projects\/([\w-]+)\/files\/([0-9]+)\/download$/i)[2]);
        const detailsMap = parseDetails($('#content .details-info ul li'));
        pfile.filename = detailsMap.get('Filename').text().trim();
        pfile.size = detailsMap.get('Size').text().trim();
        pfile.downloads = Number(detailsMap.get('Downloads').text().trim());
        pfile.updatedAt = parseDate(detailsMap.get('Uploaded'));
        pfile.uploadedBy = parseMember(detailsMap.get('Uploaded by').find('.user-tag'));
        pfile.description = parseWysiwygContent($('.details-content .details-changelog .logbox'));
        return pfile;
    }
}

//
//

export type ProjectImageItem = {
    label: string;
    caption: string;
    imageUrl: string;
    thumbnailUrl: string;
};

export type ProjectImagePage = {
    base: ProjectBasicInfo;
    images: ProjectImageItem[];
};

export class ProjectImageScrapper extends ScrapperBase {
    constructor() {
        super({
            pathRegex: /^\/projects\/([\w-]+)\/images$/,
        });
    }

    public process($: CheerioStatic) {
        const page = <ProjectImagePage>{};

        page.base = parseProjectBasic($('.project-details-container'));
        page.images = [];
        const $items = $('.listing-attachment >li');
        $items.each((index) => {
            const imItem = <ProjectImageItem>{};
            const $el = $items.eq(index);
            imItem.label = $el.find('.project-image-title').text().trim();
            imItem.caption = $el.find('a').attr('title');
            imItem.imageUrl = $el.find('a').attr('href');
            imItem.thumbnailUrl = $el.find('a img').attr('src');
            page.images.push(imItem);
        });

        return page;
    }
}

//
//

export type ForumPost = {
    date: Date;
    author: Member;
    content: WysiwygContent;
};

function parseForumPost($: Cheerio) {
    const post = <ForumPost>{};
    post.date = parseDate($.find('.p-comment-postdate'));
    post.content = parseWysiwygContent($.find('.forum-post-body'));
    post.author = parseMember($.find('.p-comment-user'));
    return post;
}

export type ForumThread = {
    url: string;
    title: string;
    posts: ForumPost[];
    categoryBreadcrumb: string[];
};

export class ForumThreadScrapper extends ScrapperBase {
    constructor() {
        super({
            pathRegex: null,
        });
    }

    public process($: CheerioStatic) {
        const fthread = <ForumThread>{
            posts: [],
            categoryBreadcrumb: [],
        };
        fthread.title = $('.p-forum .caption-threads h2').text().trim();

        const $posts = $('.p-forum .p-comment-post.forum-post');
        $posts.each((index) => {
            fthread.posts.push(parseForumPost($posts.eq(index)));
        });

        const $cbreadcrumbs = $('.primary-content >.b-breadcrumb ul >li:not(:last-child)');
        $cbreadcrumbs.each((index) => {
            if (index < 2) return;
            fthread.categoryBreadcrumb.push($cbreadcrumbs.eq(index).find('span').text());
        });

        // $('.b-pagination-list a:not([data-next-page])')

        return fthread;
    }
}
