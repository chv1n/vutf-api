import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserAccount } from './entities/user-account.entity';
import { DataSource, Repository } from 'typeorm';
import { Student } from './entities/student.entity';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: Partial<Repository<UserAccount>>;
  let dataSource: Partial<DataSource>;
  let queryRunner: any;

  beforeEach(async () => {
    usersRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        create: jest.fn(),
        save: jest.fn(),
      },
    };

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(UserAccount), useValue: usersRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should return a user if found', async () => {
      const user = { email: 'test@test.com' } as UserAccount;
      (usersRepository.findOne as jest.Mock).mockResolvedValue(user);

      const result = await service.findByEmail('test@test.com');

      expect(result).toEqual(user);
      expect(usersRepository.findOne).toHaveBeenCalledWith({ where: { email: 'test@test.com' } });
    });
  });

  describe('studentRegister', () => {
    it('should register a student successfully', async () => {
      const email = '1234567890123@mail.rmutt.ac.th';
      const passwordHash = 'hashed';
      const studentData = {
        prefixName: 'Mr.',
        firstName: 'Test',
        lastName: 'User',
        phone: '0812345678',
      };

      const savedUser = { user_uuid: 'uuid', email } as UserAccount;
      const savedStudent = { id: 1 } as unknown as Student;

      (queryRunner.manager.create as jest.Mock).mockImplementation((entity, data) => data);
      (queryRunner.manager.save as jest.Mock)
        .mockResolvedValueOnce(savedUser)
        .mockResolvedValueOnce(savedStudent);

      const result = await service.studentRegister(email, passwordHash, studentData);

      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.manager.save).toHaveBeenCalledTimes(2);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      expect(result).toEqual(savedUser);
    });

    it('should rollback transaction on error', async () => {
      (queryRunner.manager.save as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await expect(service.studentRegister('email', 'pass', {} as any)).rejects.toThrow('DB Error');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('updatePassword', () => {
    it('should update password', async () => {
      await service.updatePassword('test@test.com', 'newHash');

      expect(usersRepository.update).toHaveBeenCalledWith(
        { email: 'test@test.com' },
        { passwordHash: 'newHash' }
      );
    });
  });
});
