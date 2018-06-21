import * as cheerio from 'cheerio';
import * as request from 'request-promise';
import * as url from 'url';

export type PaginationStatus = {
    current: number;
    total: number;
};

export enum ProjectSections {
    Assets = 'assets',
    Maps = 'maps',
};

export type WysiwygContent = {
    html: string;
    simplified: string;
    embeddedImages: string[];
};

export type Member = {
    name: string;
    title: string;
    avatarUrl?: string;
    profileThumbUrl?: string;
};

export type MemberWithRole = Member & {
    role: string;
};

export type ProjectCategory = {
    name: string;
    thumbnail: string;
};

export type ProjectListItem = {
    name: string;
    title: string;
    updatedAt: Date;
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
    abandoned: boolean;
    categories: ProjectCategory[];
    description: WysiwygContent;
    createdAt: Date;
    updatedAt: Date;
    totalDownloads: number;
    owner: MemberWithRole;
    members: MemberWithRole[];
};

export type ProjectFileItem = {
    id: number;
    updatedAt: Date;
    title: string;
};

export type ProjectFile = ProjectFileItem & {
    base: ProjectBasicInfo;
    filename: string;
    downloads: number;
    size: string;
    sizeBytes: number;
    md5: string;
    description: WysiwygContent;
    uploadedBy: Member;
};

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

export type ForumPost = {
    date: Date;
    author: Member;
    content: WysiwygContent;
};

export type ForumThread = {
    url: string;
    title: string;
    posts: ForumPost[];
    categoryBreadcrumb: string[];
};

//
//

export function parsePager($: Cheerio): PaginationStatus {
    const $p = $.find('ul.b-pagination-list');
    if (!$p) {
        return {
            current: 1,
            total: 1,
        };
    }
    const $list = $p.find('>li');
    return {
        current: Number($p.find('.b-pagination-item.active').text()),
        total: Number($list.eq($list.length - 2).find('a').text()),
    };
}

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
        m.avatarUrl = $avatar.find('img').attr('src').replace('/32/32/', '/100/100/');
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

export function parseProjectsList($: Cheerio) {
    const fitems: ProjectListItem[] = [];
    const $items = $.find('.project-listing li.project-list-item');
    $items.each((index, el) => {
        const pfile = <ProjectListItem>{};
        const $el = $items.eq(index);
        pfile.name = /^\/projects\/([\w-]+)$/i.exec($el.find('.info.name a').attr('href'))[1];
        pfile.title = $el.find('.info.name a').text().trim();
        pfile.updatedAt = parseDate($el.find('.e-update-date'));
        fitems.push(pfile);
    });
    return fitems;
}

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

function parseProjectOverview($: Cheerio): ProjectOverview {
    let project = <ProjectOverview>{};

    project.base = parseProjectBasic($.find('.project-details-container'));
    const $status = $.find('.e-project-status');
    project.abandoned = $status.length && $status.text().indexOf('This project is abandoned') !== -1;

    project.description = parseWysiwygContent($.find('.project-description'));

    // <meta property="og:description" content

    const detailsMap = parseDetails($.find('.e-project-details-secondary ul.project-details li'));

    project.id = Number(detailsMap.get('Project ID').text());
    project.createdAt = parseDate(detailsMap.get('Created'));
    project.updatedAt = detailsMap.get('Last Released File').text().trim() !== 'Never' ? parseDate(detailsMap.get('Last Released File')) : project.createdAt;
    project.totalDownloads = Number(detailsMap.get('Total Downloads').text().replace(/,/g, ''));

    project.categories = [];
    const $categories = $.find('.e-project-details-secondary .project-categories >li');
    $categories.each((index, el) => {
        project.categories.push({
            name: $categories.eq(index).find('a').attr('title'),
            thumbnail: $categories.eq(index).find('img').attr('src'),
        });
    });

    project.members = [];
    const $members = $.find('.e-project-details-secondary .project-members li.user-tag-large');
    $members.each((index, el) => {
        project.members.push(parseMemberWithRole($members.eq(index)));
        if (!project.owner) {
            project.owner = project.members[0];
        }
    });

    return project;
}

export function parseProjectFilesList($: Cheerio): ProjectFileItem[] {
    const fitems: ProjectFileItem[] = [];
    const $items = $.find('table.project-file-listing tr.project-file-list-item');
    $items.each((index, el) => {
        const pfile = <ProjectFileItem>{};
        const $el = $items.eq(index);
        pfile.id = Number(/files\/([0-9]+)$/.exec($el.find('.project-file-name-container a').attr('href'))[1]);
        pfile.title = $el.find('.project-file-name-container a').data('name');
        pfile.updatedAt = parseDate($el.find('.project-file-date-uploaded'));
        fitems.push(pfile);
    });
    return fitems;
}

export function parseProjectFile($: Cheerio) {
    const pfile = <ProjectFile>{};

    pfile.base = parseProjectBasic($.find('.project-details-container'));

    pfile.title = $.find('.details-header h3').text().trim();
    pfile.id = Number($.find('.project-file-download-button-large a').attr('href').match(/^\/projects\/([\w-]+)\/files\/([0-9]+)\/download$/i)[2]);
    const detailsMap = parseDetails($.find('#content .details-info ul li'));
    pfile.filename = detailsMap.get('Filename').text().trim();
    pfile.size = detailsMap.get('Size').text().trim();
    const m = /^([0-9\.]+) (KB|MB)$/.exec(pfile.size);
    if (m) {
        pfile.sizeBytes = Number(m[1]);
        switch (m[2]) {
            case 'MB': pfile.sizeBytes *= 1024;
            case 'KB': pfile.sizeBytes *= 1024;
        }
        pfile.sizeBytes = Math.trunc(pfile.sizeBytes);
    }
    else {
        pfile.sizeBytes = 0;
    }
    pfile.md5 = detailsMap.get('MD5').text().trim();
    pfile.downloads = Number(detailsMap.get('Downloads').text().replace(/,/g, '').trim());
    pfile.updatedAt = parseDate(detailsMap.get('Uploaded'));
    pfile.uploadedBy = parseMember(detailsMap.get('Uploaded by').find('.user-tag'));
    pfile.description = parseWysiwygContent($.find('.details-content .details-changelog .logbox'));
    return pfile;
}

export function parseProjectImage($: Cheerio) {
    const page = <ProjectImagePage>{};

    page.base = parseProjectBasic($.find('.project-details-container'));
    page.images = [];
    const $items = $.find('.listing-attachment >li:not(.no-results)');
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

function parseForumPost($: Cheerio) {
    const post = <ForumPost>{};
    post.date = parseDate($.find('.p-comment-postdate'));
    post.content = parseWysiwygContent($.find('.forum-post-body'));
    post.author = parseMember($.find('.p-comment-user'));
    return post;
}

function parseForumThread($: Cheerio) {
    const fthread = <ForumThread>{
        posts: [],
        categoryBreadcrumb: [],
    };
    fthread.title = $.find('.p-forum .caption-threads h2').text().trim();

    const $posts = $.find('.p-forum .p-comment-post.forum-post');
    $posts.each((index) => {
        fthread.posts.push(parseForumPost($posts.eq(index)));
    });

    const $cbreadcrumbs = $.find('.primary-content >.b-breadcrumb ul >li:not(:last-child)');
    $cbreadcrumbs.each((index) => {
        if (index < 2) return;
        fthread.categoryBreadcrumb.push($cbreadcrumbs.eq(index).find('span').text());
    });

    // $('.b-pagination-list a:not([data-next-page])')

    return fthread;
}

//
//

export type PaginationHandler<T> = (pageInfo: PaginationStatus, results: T[]) => boolean;

export class MapsterConnection {
    private async get(p: string) {
        console.debug(`request: ${p}`);
        return (<CheerioStatic>await request.get('https://www.sc2mapster.com' + p, {
            transform: (body, response) => {
                if (response.statusCode !== 200) throw new Error(`HTTP code: ${response.statusCode}`);
                return cheerio.load(body);
            },
        })).root();
    };

    public async *getProjectsList(section: ProjectSections, pageHandler?: PaginationHandler<ProjectListItem>) {
        let cpage = 1;
        while (1) {
            const $ = await this.get(`/${section}?filter-sort=2&page=${cpage}`);
            const pageInfo = parsePager($.find('.listing-header'));
            const results = parseProjectsList($);
            yield *results;
            if (pageHandler && !pageHandler(pageInfo, results)) break;
            if (cpage >= pageInfo.total) break;
            ++cpage;
        }
    }

    public async getProjectOverview(projectName: string) {
        return parseProjectOverview(await this.get(`/projects/${projectName}`));
    }

    public async *getProjectFilesList(projectName: string) {
        let cpage = 1;
        while (1) {
            const $ = await this.get(`/projects/${projectName}/files?page=${cpage}`);
            const pageInfo = parsePager($.find('.listing-header'));
            yield *parseProjectFilesList($);
            if (cpage >= pageInfo.total) break;
            ++cpage;
        }
    }

    public async getProjectFile(projectName: string, fileId: number) {
        return parseProjectFile(await this.get(`/projects/${projectName}/files/${fileId}`));
    }

    public async getProjectImages(projectName: string) {
        return parseProjectImage(await this.get(`/projects/${projectName}/images`));
    }

    public async getForumThread(threadUrl: string) {
        const uinfo = url.parse(threadUrl);
        return parseForumThread(await this.get(uinfo.path));
    }
}
