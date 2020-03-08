import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, ManyToMany, JoinTable, Index, ManyToOne, OneToMany } from 'typeorm';
import { User } from './User';
import { ProjectCategory } from './ProjectCategory';
import { ProjectMember } from './ProjectMember';
import { ProjectFile } from './ProjectFile';
import { ProjectImage } from './ProjectImage';

@Entity()
export class Project {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('datetime')
    createdAt: Date;

    @Column('datetime')
    updatedAt: Date;

    @ManyToOne(type => User)
    @JoinColumn()
    owner: User;

    @OneToMany(type => ProjectMember, member => member.project, {
        eager: false,
    })
    members: ProjectMember[];

    @OneToMany(type => ProjectFile, file => file.project, {
        eager: false,
    })
    files: ProjectFile[];

    @OneToMany(type => ProjectImage, image => image.project, {
        eager: false,
    })
    images: ProjectImage[];

    @Column({
        unique: true,
        length: 64,
    })
    name: string;

    @Column()
    title: string;

    @Column({
        nullable: true,
    })
    imageUrl?: string;

    @Column({
        nullable: true,
    })
    thumbUrl?: string;

    @Column('varchar', {
        length: 16,
    })
    @Index()
    section: string;

    @ManyToMany(type => ProjectCategory, category => category.projects, {
        eager: true,
    })
    @JoinTable()
    categories: ProjectCategory[];

    @Column('longtext', {
        nullable: true,
    })
    description: string;

    @Column()
    abandoned: boolean;

    @Column()
    totalDownloads: number;
}
