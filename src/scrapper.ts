import * as util from 'util';
import * as cheerio from 'cheerio';
import * as request from 'request-promise-native';
import * as url from 'url';
import * as winston from 'winston';
import puppeteer from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';

export const mBaseURL = 'https://www.sc2mapster.com';

export type PaginationStatus = {
    current: number;
    total: number;
};

export enum ProjectSectionsList {
    assets = 'assets',
    maps = 'maps',
};

export type ProjectSection = keyof typeof ProjectSectionsList | string[];

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
    downladUrl: string;
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

export type ForumThreadBasic = {
    threadId: number;
    title: string;
    directLink: string;
    categoryBreadcrumb?: string[];
};

export type ForumThreadItem = ForumThreadBasic & {
    createdAt: Date;
    lastPostedAt: Date;
    postedBy: Member;
    pages: number;
    replies: number;
    views: number;
};

export type ForumPost = {
    thread: ForumThreadBasic;
    postNumber: number;
    date: Date;
    author: Member;
    content: WysiwygContent;
    directLink: string;
};

export type ForumThread = {
    url: string;
    title: string;
    directLink: string;
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
        const detailsHref = $el.find('.project-file-name-container a').attr('href');
        pfile.id = Number(/files\/([0-9]+)$/.exec(detailsHref)[1]);
        pfile.title = $el.find('.project-file-name-container a').data('name');
        pfile.updatedAt = parseDate($el.find('.project-file-date-uploaded'));
        pfile.downladUrl = detailsHref + '/download';
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

function parseForumListing($: Cheerio) {
    const fitems: ForumThreadItem[] = [];
    const $items = $.find('table.listing-forum-thread tr.forum-thread-row');
    $items.each((index, el) => {
        const pfitem = <ForumThreadItem>{};
        const $el = $items.eq(index);
        const $threadTitle = $el.find('.thread-title');
        pfitem.threadId = parseInt($threadTitle.data('id'));
        pfitem.directLink = mBaseURL + $threadTitle.data('thread-link');
        pfitem.title = $threadTitle.find('>.title').text().trim();

        const $threadAuthor = $el.find('.thread-author');
        pfitem.createdAt = parseDate($threadAuthor.find('.thread-post-date'));

        const $pagination = $el.find('ul.b-pagination');
        if ($pagination.length) {
            pfitem.pages = parseInt($pagination.find('.b-pagination-item:last-child a').attr('href').match(/([0-9]+)$/)[1]);
        }
        else {
            pfitem.pages = 1;
        }

        const $lastpost = $el.find('.col-last-post');
        pfitem.postedBy = <Member>{};
        const $avatar = $lastpost.find('.avatar');
        if ($avatar) {
            pfitem.postedBy.profileThumbUrl = $avatar.find('img').attr('src');
        }

        const $postAuthor = $lastpost.find('.post-author');
        pfitem.postedBy.name = $postAuthor.find('a').attr('href').match(/^\/members\/([\w-]+)$/i)[1];
        pfitem.postedBy.title = $postAuthor.find('span').text();
        pfitem.lastPostedAt = parseDate($lastpost.find('.post-date'));

        pfitem.replies = parseInt(String($el.find('.col-count >a').data('count')).replace(',', ''));
        pfitem.views = parseInt(String($el.find('.col-count +.col-count').data('count')).replace(',', ''));

        fitems.push(pfitem);
    });
    return fitems;
}

function parseForumThreadBasic($: Cheerio) {
    const bthread = <ForumThreadBasic>{
        threadId: parseInt($.find('.forum-posts').data('id')),
        directLink: mBaseURL + url.parse($.find('head link[rel="canonical"]').attr('href')).pathname,
        categoryBreadcrumb: [],
        title: $.find('.p-forum .caption-threads h2').text().trim(),
    };

    const $cbreadcrumbs = $.find('.primary-content >.b-breadcrumb ul >li:not(:last-child)');
    $cbreadcrumbs.each((index) => {
        if (index < 2) return;
        bthread.categoryBreadcrumb.push($cbreadcrumbs.eq(index).find('span').text());
    });

    return bthread;
}

function parseForumPost($: Cheerio, thread: ForumThreadBasic) {
    const post = <ForumPost>{
        thread: thread,
    };
    post.date = parseDate($.find('.p-comment-postdate'));
    post.content = parseWysiwygContent($.find('.forum-post-body'));
    post.author = parseMember($.find('.p-comment-user'));
    post.postNumber = parseInt($.find('.j-comment-link').attr('href').match(/(\d+)$/)[1]);
    post.directLink = `${thread.directLink}?comment=${post.postNumber}`;
    return post;
}

function parseForumPostList($: Cheerio) {
    const bthread = parseForumThreadBasic($);
    const rposts: ForumPost[] = [];
    const $posts = $.find('.p-forum .p-comment-post.forum-post');
    $posts.each((index) => {
        const tmp = parseForumPost($posts.eq(index), bthread);
        tmp.thread = bthread;
        rposts.push(tmp);
    });

    return rposts;
}

function parseForumThread($: Cheerio) {
    const fthread = <ForumThread>{
        posts: [],
        categoryBreadcrumb: [],
    };
    fthread.title = $.find('.p-forum .caption-threads h2').text().trim();
    const bthread = parseForumThreadBasic($);

    const $posts = $.find('.p-forum .p-comment-post.forum-post');
    $posts.each((index) => {
        fthread.posts.push(parseForumPost($posts.eq(index), bthread));
    });

    fthread.categoryBreadcrumb = bthread.categoryBreadcrumb;

    return fthread;
}

//
//

export interface MapsterConnOpts {
    captcha2Token?: string;
    logger?: winston.Logger;
};

export type PaginationHandler<T> = (pageInfo: PaginationStatus, results: T[]) => boolean;
export let mBrowser: puppeteer.Browser;

export class MapsterConnection {
    protected cpage: puppeteer.Page;
    protected logger: winston.Logger;

    public async setup(opts?: MapsterConnOpts) {
        opts = Object.assign<MapsterConnOpts, MapsterConnOpts>({
            captcha2Token: '',
        }, opts);

        if (opts.logger) {
            this.logger = opts.logger;
        }
        else {
            this.logger = winston.createLogger({
                level: 'debug',
                format: winston.format.combine(
                    winston.format.timestamp({
                        alias: 'time',
                        format: 'hh:mm:ss.SSS',
                    }),
                    winston.format.ms(),
                    winston.format.prettyPrint({ colorize: false, depth: 2 }),
                    winston.format.printf(info => {
                        const out = [
                            `${info.time} ${info.level.substr(0, 3).toUpperCase()} ${info.message} ${info.ms}`
                        ];

                        const splat: any[] = info[<any>Symbol.for('splat')];
                        if (Array.isArray(splat)) {
                            const dump = splat.length === 1 ? splat.pop() : splat;
                            out.push(util.inspect(dump, {
                                colors: false,
                                depth: 3,
                                compact: true,
                                maxArrayLength: 500,
                                breakLength: 140,
                            }));
                        }

                        return out.join('\n');
                    }),
                ),
                transports: [
                    new winston.transports.Console(),
                ],
            });
        }

        if (!mBrowser) {
            puppeteerExtra
                .use(StealthPlugin())
                .use(RecaptchaPlugin({
                    provider: { id: '2captcha', token: opts.captcha2Token },
                    visualFeedback: true // colorize reCAPTCHAs (violet = detected, green = solved)
                }))
            ;
            mBrowser = await puppeteerExtra.launch({
                headless: true,
                executablePath: 'chromium',
                userDataDir: `${require('os').homedir()}/.config/chromium`,
                args: [
                    '--no-sandbox',
                    // `--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36`,
                    // `--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/73.0.3683.86 HeadlessChrome/73.0.3683.86 Safari/537.36`,
                    `--homepage 'about:blank'`,
                ],
            });

            const bPages = await mBrowser.pages();
            if (bPages.length) {
                this.cpage = bPages[0];
            }
        }

        if (!this.cpage) {
            this.cpage = await mBrowser.newPage();
        }
        await this.cpage.setExtraHTTPHeaders({'Accept-Language': 'en-US,en;q=0.9'});
    }

    public async close() {
        if (this.cpage) {
            await this.cpage.close();
            this.cpage = void 0;
        }
        if (!(await mBrowser.pages()).length) {
            await mBrowser.close();
            mBrowser = void 0;
        }
    }

    private async get(p: string): Promise<Cheerio> {
        if (p.startsWith('/')) {
            p = mBaseURL + p;
        }
        await this.cpage.setJavaScriptEnabled(false);

        this.logger.debug(`goto: ${p}`);
        const resp = await this.cpage.goto(p, {
            waitUntil: 'domcontentloaded',
        });
        const text = await resp.text();

        if (resp.status() !== 200) {
            if (resp.status() === 403 && text.search('<meta name="captcha-bypass" id="captcha-bypass" />') !== -1) {
                this.logger.debug('Got captcha to solve..');
                await this.cpage.setJavaScriptEnabled(true);
                await this.cpage.reload();
                this.logger.debug('Solving..');
                const cr = await this.cpage.solveRecaptchas();
                this.logger.debug('Captcha result', cr);
                if (cr.error) {
                    throw new Error(`Failed to resolve captcha`);
                }

                await this.cpage.waitForNavigation({ waitUntil: 'load' });
            }
            else {
                throw new Error(`HTTP code: ${resp.status()}`);
            }
        }

        this.logger.debug('loaded', {
            title: await this.cpage.title(),
            url: this.cpage.url(),
        });
        return cheerio.load(await this.cpage.content()).root();
    };

    public async *getProjectsList(section: ProjectSection, pageHandler?: PaginationHandler<ProjectListItem>) {
        let spath: string;
        if (Array.isArray(section)) {
            spath = section.join('/');
        }
        else {
            spath = section;
        }

        let cpage = 1;
        while (1) {
            const $ = await this.get(`/${spath}?filter-sort=2&page=${cpage}`);
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

    public async *getProjectFilesList(projectName: string, pageHandler?: PaginationHandler<ProjectFileItem>) {
        let cpage = 1;
        while (1) {
            const $ = await this.get(`/projects/${projectName}/files?page=${cpage}`);
            const pageInfo = parsePager($.find('.listing-header'));
            const results = parseProjectFilesList($);
            yield *results;
            if (pageHandler && !pageHandler(pageInfo, results)) break;
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

    public async getForumRecent() {
        return parseForumListing(await this.get(`/new-content?filter-prefix=&filter-thread-search=&filter-date-range-type=3&filter-association-type=1`));
    }

    public async getForumThread(cpath: string) {
        if (!cpath.startsWith('/') && !cpath.match(/^https?:\/\/.*/)) {
            cpath = `/forums/${cpath}`;
        }

        return parseForumThread(await this.get(`${cpath}`));
    }

    public async *getForumPostList(cpath: string, pageHandler?: PaginationHandler<ForumPost>, opts?: { pFrom: number, pTo: number }) {
        let cpage = 1;
        let pmod = 1;
        if (opts) {
            cpage = opts.pFrom;
            pmod = opts.pTo < opts.pFrom ? -1 : 1;
        }

        if (!cpath.startsWith('/') && !cpath.match(/^https?:\/\/.*/)) {
            cpath = `/forums/${cpath}`;
        }

        while (1) {
            const $ = await this.get(`${cpath}?page=${cpage}`);
            const pageInfo = parsePager($.find('.listing-header'));
            let results = parseForumPostList($);
            if (pmod === -1) {
                results = results.reverse();
            }
            yield *results;
            if (pageHandler && !pageHandler(pageInfo, results)) break;
            if ((cpage >= pageInfo.total && pmod === 1) || (cpage <= 1 && pmod === -1)) break;
            cpage += pmod;
        }
    }
}
