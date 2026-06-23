import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'TeamSync App Development', description: 'The name of the project' })
  @IsString()
  @IsNotEmpty({ message: 'Project name is required' })
  name!: string;

  @ApiProperty({
    example: 'Build mobile companion and next.js dashboard applications.',
    description: 'The description of the project',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
