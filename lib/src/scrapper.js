"use strict";
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __asyncDelegator = (this && this.__asyncDelegator) || function (o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; } : f; }
};
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const util = __importStar(require("util"));
const cheerio = __importStar(require("cheerio"));
const url = __importStar(require("url"));
const winston = __importStar(require("winston"));
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
const puppeteer_extra_plugin_recaptcha_1 = __importDefault(require("puppeteer-extra-plugin-recaptcha"));
exports.mBaseURL = 'https://www.sc2mapster.com';
var ProjectSectionsList;
(function (ProjectSectionsList) {
    ProjectSectionsList["assets"] = "assets";
    ProjectSectionsList["maps"] = "maps";
})(ProjectSectionsList = exports.ProjectSectionsList || (exports.ProjectSectionsList = {}));
;
//
//
function parsePager($) {
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
exports.parsePager = parsePager;
function parseDetails($elements) {
    let detailsMap = new Map();
    $elements.each((index, el) => {
        const $ = cheerio.load(el);
        detailsMap.set($('.info-label').text().trim(), $('.info-data'));
    });
    return detailsMap;
}
function parseDate($el) {
    return new Date(Number($el.find('abbr').data('epoch')) * 1000);
}
function parseMember($el) {
    const m = {};
    let $username;
    if ($el.hasClass('p-comment-user')) {
        $username = $el.find('.p-comment-username a');
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
function parseMemberWithRole($el) {
    const m = parseMember($el);
    m.role = $el.find('.info-wrapper .title').text().trim();
    return m;
}
function parseEmbeddedImages($el) {
    const l = [];
    $el.find('img[src]').each((index, el) => {
        const src = el.attribs['src'];
        if (/^https?:\/\/(?:www\.)?sc2mapster\.com\/thumbman\//.exec(src))
            return;
        l.push(src);
    });
    return l;
}
exports.parseEmbeddedImages = parseEmbeddedImages;
function parseWysiwygContent($el) {
    const cnt = {};
    cnt.html = $el.html().trim();
    cnt.simplified = $el.text().trim().replace(/\s+/g, ' ');
    cnt.embeddedImages = parseEmbeddedImages($el);
    return cnt;
}
exports.parseWysiwygContent = parseWysiwygContent;
function parseProjectsList($) {
    const fitems = [];
    const $items = $.find('.project-listing li.project-list-item');
    $items.each((index, el) => {
        const pfile = {};
        const $el = $items.eq(index);
        pfile.name = /^\/projects\/([\w-]+)$/i.exec($el.find('.info.name a').attr('href'))[1];
        pfile.title = $el.find('.info.name a').text().trim();
        pfile.updatedAt = parseDate($el.find('.e-update-date'));
        fitems.push(pfile);
    });
    return fitems;
}
exports.parseProjectsList = parseProjectsList;
function parseProjectBasic($) {
    const pinfo = {};
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
function parseProjectOverview($) {
    let project = {};
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
function parseProjectFilesList($) {
    const fitems = [];
    const $items = $.find('table.project-file-listing tr.project-file-list-item');
    $items.each((index, el) => {
        const pfile = {};
        const $el = $items.eq(index);
        const detailsHref = $el.find('.project-file-name-container a').attr('href');
        pfile.id = Number(/files\/([0-9]+)$/.exec(detailsHref)[1]);
        pfile.title = $el.find('.project-file-name-container a').data('name');
        pfile.updatedAt = parseDate($el.find('.project-file-date-uploaded'));
        pfile.downloadUrl = detailsHref + '/download';
        fitems.push(pfile);
    });
    return fitems;
}
exports.parseProjectFilesList = parseProjectFilesList;
function parseProjectFile($) {
    const pfile = {};
    pfile.base = parseProjectBasic($.find('.project-details-container'));
    pfile.title = $.find('.details-header h3').text().trim();
    const dlhref = $.find('.project-file-download-button-large a').attr('href');
    pfile.id = Number(dlhref.match(/^\/projects\/([\w-]+)\/files\/([0-9]+)\/download$/i)[2]);
    pfile.downloadUrl = dlhref;
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
    const idstr = pfile.id.toString();
    pfile.cdnUrl = `https://edge.forgecdn.net/files/${idstr.substr(0, Math.ceil(idstr.length / 2.0))}/${idstr.substr(Math.ceil(idstr.length / 2.0))}/${pfile.filename}`;
    pfile.downloads = Number(detailsMap.get('Downloads').text().replace(/,/g, '').trim());
    pfile.updatedAt = parseDate(detailsMap.get('Uploaded'));
    pfile.uploadedBy = parseMember(detailsMap.get('Uploaded by').find('.user-tag'));
    pfile.description = parseWysiwygContent($.find('.details-content .details-changelog .logbox'));
    return pfile;
}
exports.parseProjectFile = parseProjectFile;
function parseProjectImage($) {
    const page = {};
    page.base = parseProjectBasic($.find('.project-details-container'));
    page.images = [];
    const $items = $.find('.listing-attachment >li:not(.no-results)');
    $items.each((index) => {
        const imItem = {};
        const $el = $items.eq(index);
        imItem.label = $el.find('.project-image-title').text().trim();
        imItem.caption = $el.find('a').attr('title');
        imItem.imageUrl = $el.find('a').attr('href');
        imItem.thumbnailUrl = $el.find('a img').attr('src');
        page.images.push(imItem);
    });
    return page;
}
exports.parseProjectImage = parseProjectImage;
function parseForumListing($) {
    const fitems = [];
    const $items = $.find('table.listing-forum-thread tr.forum-thread-row');
    $items.each((index, el) => {
        const pfitem = {};
        const $el = $items.eq(index);
        const $threadTitle = $el.find('.thread-title');
        pfitem.threadId = parseInt($threadTitle.data('id'));
        pfitem.directLink = exports.mBaseURL + $threadTitle.data('thread-link');
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
        pfitem.postedBy = {};
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
function parseForumThreadBasic($) {
    const bthread = {
        threadId: parseInt($.find('.forum-posts').data('id')),
        directLink: exports.mBaseURL + url.parse($.find('head link[rel="canonical"]').attr('href')).pathname,
        categoryBreadcrumb: [],
        title: $.find('.p-forum .caption-threads h2').text().trim(),
    };
    const $cbreadcrumbs = $.find('.primary-content >.b-breadcrumb ul >li:not(:last-child)');
    $cbreadcrumbs.each((index) => {
        if (index < 2)
            return;
        bthread.categoryBreadcrumb.push($cbreadcrumbs.eq(index).find('span').text());
    });
    return bthread;
}
function parseForumPost($, thread) {
    const post = {
        thread: thread,
    };
    post.date = parseDate($.find('.p-comment-postdate'));
    post.content = parseWysiwygContent($.find('.forum-post-body'));
    post.author = parseMember($.find('.p-comment-user'));
    post.postNumber = parseInt($.find('.j-comment-link').attr('href').match(/(\d+)$/)[1]);
    post.directLink = `${thread.directLink}?comment=${post.postNumber}`;
    return post;
}
function parseForumPostList($) {
    const bthread = parseForumThreadBasic($);
    const rposts = [];
    const $posts = $.find('.p-forum .p-comment-post.forum-post');
    $posts.each((index) => {
        const tmp = parseForumPost($posts.eq(index), bthread);
        tmp.thread = bthread;
        rposts.push(tmp);
    });
    return rposts;
}
function parseForumThread($) {
    const fthread = {
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
;
class MapsterConnection {
    async setup(opts) {
        var _a, _b;
        opts = Object.assign({
            captcha2Token: '',
        }, opts);
        if (opts.logger) {
            this.logger = opts.logger;
        }
        else {
            this.logger = winston.createLogger({
                level: 'debug',
                format: winston.format.combine(winston.format.timestamp({
                    alias: 'time',
                    format: 'HH:mm:ss.SSS',
                }), winston.format.prettyPrint({ colorize: false, depth: 2 }), winston.format.printf(info => {
                    const out = [
                        `${info.time} ${info.level.toUpperCase().padEnd(8)} ${info.message}`
                    ];
                    const splat = info[Symbol.for('splat')];
                    if (Array.isArray(splat)) {
                        const dump = splat.length === 1 ? splat.pop() : splat;
                        out.push(util.inspect(dump, {
                            colors: true,
                            depth: 2,
                            compact: true,
                            maxArrayLength: 500,
                            breakLength: 140,
                        }));
                    }
                    return out.join('\n');
                })),
                transports: [
                    new winston.transports.Console(),
                ],
            });
        }
        if (!exports.mBrowser) {
            const pExtra = puppeteer_extra_1.default
                .use(puppeteer_extra_plugin_stealth_1.default())
                .use(puppeteer_extra_plugin_recaptcha_1.default({
                provider: { id: '2captcha', token: opts.captcha2Token },
                visualFeedback: true // colorize reCAPTCHAs (violet = detected, green = solved)
            }));
            const pupUserDir = (_a = process.env.APP_PUPPETEER_DATA_DIR) !== null && _a !== void 0 ? _a : './puppeteer';
            exports.mBrowser = await pExtra.launch({
                headless: true,
                // executablePath: 'chromium',
                userDataDir: pupUserDir,
                args: [
                    `--no-sandbox`,
                    `--no-default-browser-check`,
                    `--window-size=1280,800`,
                    `--user-agent=${(_b = opts.userAgent) !== null && _b !== void 0 ? _b : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:73.0) Gecko/20100101 Firefox/73.0'}`,
                ],
                ignoreDefaultArgs: [
                    `--enable-automation`,
                ],
            });
            const bPages = await exports.mBrowser.pages();
            if (bPages.length) {
                this.cpage = bPages[0];
            }
        }
        if (!this.cpage) {
            this.cpage = await exports.mBrowser.newPage();
        }
        await this.cpage.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
        await this.cpage.setCacheEnabled(false);
    }
    async close() {
        const pnum = (await exports.mBrowser.pages()).length;
        if (this.cpage && pnum > 1) {
            this.logger.info(`closing page #${pnum}`);
            await this.cpage.close({ runBeforeUnload: true });
            this.cpage = void 0;
        }
        if (pnum <= 1) {
            this.logger.info('closing browser');
            await exports.mBrowser.close();
            exports.mBrowser = void 0;
            this.cpage = void 0;
        }
    }
    async get(p) {
        if (p.startsWith('/')) {
            p = exports.mBaseURL + p;
        }
        // await this.cpage.setJavaScriptEnabled(false);
        this.logger.debug(`### GOTO: ${p}`);
        this.logger.debug('cookies for sc2mapster', JSON.stringify((await this.cpage.cookies(exports.mBaseURL))));
        const resp = await this.cpage.goto(p, {
            waitUntil: 'domcontentloaded',
        });
        this.logger.debug('req headers', resp.request().headers());
        const text = await resp.text();
        this.logger.debug('resp headers', resp.headers());
        if (resp.status() !== 200) {
            if (resp.status() === 403 && text.search('<meta name="captcha-bypass" id="captcha-bypass" />') !== -1) {
                this.logger.debug('Got captcha to solve..');
                // await this.cpage.setJavaScriptEnabled(true);
                await this.cpage.reload();
                this.logger.debug('Solving..');
                const cr = await this.cpage.solveRecaptchas();
                this.logger.debug('Captcha result', cr === null || cr === void 0 ? void 0 : cr.solutions);
                if (cr.error) {
                    throw new Error(`Failed to resolve captcha`);
                }
                await this.cpage.waitForNavigation();
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
    }
    ;
    getProjectsList(section, pageHandler) {
        return __asyncGenerator(this, arguments, function* getProjectsList_1() {
            let spath;
            if (Array.isArray(section)) {
                spath = section.join('/');
            }
            else {
                spath = section;
            }
            let cpage = 1;
            while (1) {
                const $ = yield __await(this.get(`/${spath}?filter-sort=2&page=${cpage}`));
                const pageInfo = parsePager($.find('.listing-header'));
                const results = parseProjectsList($);
                yield __await(yield* __asyncDelegator(__asyncValues(results)));
                if (pageHandler && !pageHandler(pageInfo, results))
                    break;
                if (cpage >= pageInfo.total)
                    break;
                ++cpage;
            }
        });
    }
    async getProjectOverview(projectName) {
        return parseProjectOverview(await this.get(`/projects/${projectName}`));
    }
    getProjectFilesList(projectName, pageHandler) {
        return __asyncGenerator(this, arguments, function* getProjectFilesList_1() {
            let cpage = 1;
            while (1) {
                const $ = yield __await(this.get(`/projects/${projectName}/files?page=${cpage}`));
                const pageInfo = parsePager($.find('.listing-header'));
                const results = parseProjectFilesList($);
                yield __await(yield* __asyncDelegator(__asyncValues(results)));
                if (pageHandler && !pageHandler(pageInfo, results))
                    break;
                if (cpage >= pageInfo.total)
                    break;
                ++cpage;
            }
        });
    }
    async getProjectFile(projectName, fileId) {
        return parseProjectFile(await this.get(`/projects/${projectName}/files/${fileId}`));
    }
    async getProjectImages(projectName) {
        return parseProjectImage(await this.get(`/projects/${projectName}/images`));
    }
    async getForumRecent() {
        return parseForumListing(await this.get(`/new-content?filter-prefix=&filter-thread-search=&filter-date-range-type=3&filter-association-type=1`));
    }
    async getForumThread(cpath) {
        if (!cpath.startsWith('/') && !cpath.match(/^https?:\/\/.*/)) {
            cpath = `/forums/${cpath}`;
        }
        return parseForumThread(await this.get(`${cpath}`));
    }
    getForumPostList(cpath, pageHandler, opts) {
        return __asyncGenerator(this, arguments, function* getForumPostList_1() {
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
                const $ = yield __await(this.get(`${cpath}?page=${cpage}`));
                const pageInfo = parsePager($.find('.listing-header'));
                let results = parseForumPostList($);
                if (pmod === -1) {
                    results = results.reverse();
                }
                yield __await(yield* __asyncDelegator(__asyncValues(results)));
                if (pageHandler && !pageHandler(pageInfo, results))
                    break;
                if ((cpage >= pageInfo.total && pmod === 1) || (cpage <= 1 && pmod === -1))
                    break;
                cpage += pmod;
            }
        });
    }
}
exports.MapsterConnection = MapsterConnection;
//# sourceMappingURL=scrapper.js.map