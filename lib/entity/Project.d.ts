import { User } from './User';
import { ProjectCategory } from './ProjectCategory';
import { ProjectMember } from './ProjectMember';
import { ProjectFile } from './ProjectFile';
import { ProjectImage } from './ProjectImage';
export declare class Project {
    id: number;
    createdAt: Date;
    updatedAt: Date;
    owner: User;
    members: ProjectMember[];
    files: ProjectFile[];
    images: ProjectImage[];
    name: string;
    title: string;
    imageUrl?: string;
    thumbUrl?: string;
    section: string;
    categories: ProjectCategory[];
    description: string;
    abandoned: boolean;
    totalDownloads: number;
}
