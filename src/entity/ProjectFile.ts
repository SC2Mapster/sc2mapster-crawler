import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, ManyToMany, JoinTable, Index, ManyToOne } from 'typeorm';
import { User } from './User';
import { Project } from './Project';

@Entity()
export class ProjectFile {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        unique: true,
    })
    originalId: number;

    @Column('datetime')
    createdAt: Date;

    @ManyToOne(type => User)
    @JoinColumn()
    uploader: User;

    @ManyToOne(type => Project, project => project.files)
    @JoinColumn()
    project: Project;

    @Column()
    filename: string;

    @Column()
    downloadUrl: string;

    @Column()
    cdnUrl: string;

    @Column()
    md5: string;

    @Column()
    size: number;

    @Column()
    downloadsCount: number;

    @Column('text', {
        nullable: true,
    })
    description: string;
}
