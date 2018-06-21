import { User } from './User';
import { Project } from './Project';
export declare class ProjectMember {
    id: number;
    user: User;
    project: Project;
    role: string;
}
