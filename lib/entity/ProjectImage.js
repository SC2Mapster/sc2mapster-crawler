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
const Project_1 = require("./Project");
let ProjectImage = class ProjectImage {
};
__decorate([
    typeorm_1.PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], ProjectImage.prototype, "id", void 0);
__decorate([
    typeorm_1.ManyToOne(type => Project_1.Project, project => project.images),
    typeorm_1.JoinColumn(),
    __metadata("design:type", Project_1.Project)
], ProjectImage.prototype, "project", void 0);
__decorate([
    typeorm_1.Column(),
    __metadata("design:type", String)
], ProjectImage.prototype, "label", void 0);
__decorate([
    typeorm_1.Column(),
    __metadata("design:type", String)
], ProjectImage.prototype, "caption", void 0);
__decorate([
    typeorm_1.Column(),
    __metadata("design:type", String)
], ProjectImage.prototype, "imageUrl", void 0);
__decorate([
    typeorm_1.Column(),
    __metadata("design:type", String)
], ProjectImage.prototype, "thumbUrl", void 0);
ProjectImage = __decorate([
    typeorm_1.Entity()
], ProjectImage);
exports.ProjectImage = ProjectImage;
//# sourceMappingURL=ProjectImage.js.map