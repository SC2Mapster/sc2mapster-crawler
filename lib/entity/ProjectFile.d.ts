import { User } from './User';
import { Project } from './Project';
export declare class ProjectFile {
    id: number;
    originalId: number;
    createdAt: Date;
    uploader: User;
    project: Project;
    filename: string;
    md5: string;
    size: number;
    downloadsCount: number;
    description: string;
}
