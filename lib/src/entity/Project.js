"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const ProjectCategory_1 = require("./ProjectCategory");
const ProjectMember_1 = require("./ProjectMember");
const ProjectFile_1 = require("./ProjectFile");
const ProjectImage_1 = require("./ProjectImage");
let Project = class Project {
};
__decorate([
    typeorm_1.PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], Project.prototype, "id", void 0);
__decorate([
    typeorm_1.Column('datetime'),
    __metadata("design:type", Date)
], Project.prototype, "createdAt", void 0);
__decorate([
    typeorm_1.Column('datetime'),
    __metadata("design:type", Date)
], Project.prototype, "updatedAt", void 0);
__decorate([
    typeorm_1.ManyToOne(type => User_1.User),
    typeorm_1.JoinColumn(),
    __metadata("design:type", User_1.User)
], Project.prototype, "owner", void 0);
__decorate([
    typeorm_1.OneToMany(type => ProjectMember_1.ProjectMember, member => member.project, {
        eager: false,
    }),
    __metadata("design:type", Array)
], Project.prototype, "members", void 0);
__decorate([
    typeorm_1.OneToMany(type => ProjectFile_1.ProjectFile, file => file.project, {
        eager: false,
    }),
    __metadata("design:type", Array)
], Project.prototype, "files", void 0);
__decorate([
    typeorm_1.OneToMany(type => ProjectImage_1.ProjectImage, image => image.project, {
        eager: false,
    }),
    __metadata("design:type", Array)
], Project.prototype, "images", void 0);
__decorate([
    typeorm_1.Column({
        unique: true,
        length: 64,
    }),
    __metadata("design:type", String)
], Project.prototype, "name", void 0);
__decorate([
    typeorm_1.Column(),
    __metadata("design:type", String)
], Project.prototype, "title", void 0);
__decorate([
    typeorm_1.Column({
        nullable: true,
    }),
    __metadata("design:type", String)
], Project.prototype, "imageUrl", void 0);
__decorate([
    typeorm_1.Column({
        nullable: true,
    }),
    __metadata("design:type", String)
], Project.prototype, "thumbUrl", void 0);
__decorate([
    typeorm_1.Column('varchar', {
        length: 16,
    }),
    typeorm_1.Index(),
    __metadata("design:type", String)
], Project.prototype, "section", void 0);
__decorate([
    typeorm_1.ManyToMany(type => ProjectCategory_1.ProjectCategory, category => category.projects, {
        eager: true,
    }),
    typeorm_1.JoinTable(),
    __metadata("design:type", Array)
], Project.prototype, "categories", void 0);
__decorate([
    typeorm_1.Column('longtext', {
        nullable: true,
    }),
    __metadata("design:type", String)
], Project.prototype, "description", void 0);
__decorate([
    typeorm_1.Column(),
    __metadata("design:type", Boolean)
], Project.prototype, "abandoned", void 0);
__decorate([
    typeorm_1.Column(),
    __metadata("design:type", Number)
], Project.prototype, "totalDownloads", void 0);
Project = __decorate([
    typeorm_1.Entity()
], Project);
exports.Project = Project;
//# sourceMappingURL=Project.js.map