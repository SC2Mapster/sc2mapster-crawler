import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, ManyToMany, JoinTable, Index } from 'typeorm';
import { Project } from './Project';

@Entity()
export class ProjectCategory {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        unique: true,
        length: 64,
    })
    title: string;

    @Column('varchar', {
        nullable: true,
    })
    iconUrl: string;

    @ManyToMany(type => Project, project => project.categories)
    projects: Project[];
}
