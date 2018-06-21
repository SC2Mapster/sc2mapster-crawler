import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, ManyToMany, JoinTable, Index, ManyToOne } from 'typeorm';
import { Project } from './Project';

@Entity()
export class ProjectImage {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(type => Project, project => project.images)
    @JoinColumn()
    project: Project;

    @Column()
    label: string;

    @Column()
    caption: string;

    @Column()
    imageUrl: string;

    @Column()
    thumbUrl: string;
}
