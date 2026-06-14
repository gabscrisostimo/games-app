import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateOrJoin, Lobby } from './LobbyScreens';
import type { RoomView } from '../protocol';

describe('CreateOrJoin', () => {
  it('cria sala com apelido e dispara onEnter com um código gerado', async () => {
    const onEnter = vi.fn();
    render(<CreateOrJoin onEnter={onEnter} />);
    await userEvent.type(screen.getByLabelText(/apelido/i), 'Ana');
    await userEvent.click(screen.getByRole('button', { name: /criar sala/i }));
    expect(onEnter).toHaveBeenCalledTimes(1);
    const [code, nickname] = onEnter.mock.calls[0];
    expect(code).toMatch(/^[A-HJ-NP-Z]{4}$/);
    expect(nickname).toBe('Ana');
  });

  it('entra em sala existente com código + apelido', async () => {
    const onEnter = vi.fn();
    render(<CreateOrJoin onEnter={onEnter} />);
    await userEvent.type(screen.getByLabelText(/apelido/i), 'Bia');
    await userEvent.type(screen.getByLabelText(/código/i), 'wxyz');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    expect(onEnter).toHaveBeenCalledWith('WXYZ', 'Bia');
  });

  it('com código preenchido mas apelido vazio, explica por que o Entrar está bloqueado', async () => {
    render(<CreateOrJoin onEnter={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/código/i), 'WXYZ');
    expect(screen.getByRole('button', { name: /entrar/i })).toBeDisabled();
    expect(screen.getByText(/preencha o apelido/i)).toBeInTheDocument();
  });

  it('ao preencher o apelido, a dica some e o Entrar habilita', async () => {
    render(<CreateOrJoin onEnter={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/código/i), 'WXYZ');
    await userEvent.type(screen.getByLabelText(/apelido/i), 'Bia');
    expect(screen.getByRole('button', { name: /entrar/i })).toBeEnabled();
    expect(screen.queryByText(/preencha o apelido/i)).not.toBeInTheDocument();
  });
});

describe('Lobby', () => {
  const base: RoomView = {
    code: 'WXYZ',
    phase: 'lobby',
    hostId: 'a',
    minPlayers: 3,
    players: [
      { id: 'a', nickname: 'Ana', present: true },
      { id: 'b', nickname: 'Bia', present: true },
    ],
  };

  it('lista jogadores e mostra o código', () => {
    render(<Lobby room={base} me="b" onStart={vi.fn()} />);
    expect(screen.getByText('WXYZ')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Bia')).toBeInTheDocument();
  });

  it('host vê Começar desabilitado abaixo do mínimo', () => {
    render(<Lobby room={base} me="a" onStart={vi.fn()} />);
    expect(screen.getByRole('button', { name: /começar/i })).toBeDisabled();
  });

  it('host com jogadores suficientes consegue começar', async () => {
    const onStart = vi.fn();
    const room = { ...base, players: [...base.players, { id: 'c', nickname: 'Cau', present: true }] };
    render(<Lobby room={room} me="a" onStart={onStart} />);
    const btn = screen.getByRole('button', { name: /começar/i });
    expect(btn).toBeEnabled();
    await userEvent.click(btn);
    expect(onStart).toHaveBeenCalled();
  });

  it('não-host não vê o botão Começar', () => {
    render(<Lobby room={base} me="b" onStart={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /começar/i })).not.toBeInTheDocument();
  });
});
