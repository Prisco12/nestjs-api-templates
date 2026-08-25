import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';
import { ResetPasswordDto } from './reset-password.dto';

describe('Password policy DTOs', () => {
  it.each([
    ['short', 'Aa1!'],
    ['without uppercase', 'senhasegura123!'],
    ['without lowercase', 'SENHASEGURA123!'],
    ['without number', 'SenhaSeguraSemNumero!'],
    ['without symbol', 'SenhaSegura12345'],
  ])('rejects a weak registration password: %s', async (_case, password) => {
    const dto = new RegisterDto();
    dto.email = 'user@example.com';
    dto.password = password;

    expect(await validate(dto)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'password' }),
      ]),
    );
  });

  it('rejects a weak password during reset', async () => {
    const dto = new ResetPasswordDto();
    dto.token = 'user-id.secret-with-at-least-twenty-characters';
    dto.password = 'weak-password';

    expect(await validate(dto)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'password' }),
      ]),
    );
  });
});
