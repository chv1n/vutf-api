import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    OneToOne,
    JoinColumn,
} from 'typeorm';
import { UserAccount } from './user-account.entity';

@Entity({ name: 'instructor' })
export class Instructor {
    @PrimaryGeneratedColumn('uuid')
    instructor_uuid: string;

    @Column({ unique: true })
    instructor_code: string;

    @Column()
    first_name: string;

    @Column()
    last_name: string;

    @Column('uuid', { nullable: true })
    user_uuid: string | null;


    @CreateDateColumn()
    create_at: Date;

    @OneToOne(() => UserAccount, (user) => user.instructor, {
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'user_uuid' })
    user: UserAccount;

}
