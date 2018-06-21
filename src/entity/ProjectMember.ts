import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, ManyToMany, JoinTable, Index, ManyToOne } from 'typeorm';
import { User } from './User';
import { Project } from './Project';

@Entity()
export class ProjectMember {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(type => User, {
        eager: true,
    })
    @JoinColumn()
    user: User;

    @ManyToOne(type => Project, project => project.members)
    @JoinColumn()
    project: Project;

    @Column()
    role: string;
}
