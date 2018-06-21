import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        unique: true,
        length: 64,
    })
    username: string;

    @Column({
        nullable: true,
    })
    avatarUrl?: string;
}
