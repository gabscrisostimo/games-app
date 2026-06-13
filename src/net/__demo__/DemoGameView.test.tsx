import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemoGameView } from './DemoGameView';
import type { DemoProjection } from './promptvoteDemo';

describe('DemoGameView', () => {
  it('answering: mostra prompt e envia resposta', async () => {
    const send = vi.fn();
    const proj: DemoProjection = {
      phase: 'answering',
      prompt: 'Um nome ruim pra banda',
      yourAnswer: null,
      submitted: 1,
      total: 3,
      endsAt: Date.now() + 60000,
    };
    render(<DemoGameView projection={proj} onAction={send} />);
    expect(screen.getByText(/nome ruim pra banda/i)).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox'), 'Os Bug Sujos');
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }));
    expect(send).toHaveBeenCalledWith({ type: 'SUBMIT_ANSWER', text: 'Os Bug Sujos' });
  });

  it('answering: depois de responder mostra estado de espera', () => {
    const proj: DemoProjection = {
      phase: 'answering',
      prompt: 'p',
      yourAnswer: 'já respondi',
      submitted: 2,
      total: 3,
      endsAt: Date.now() + 60000,
    };
    render(<DemoGameView projection={proj} onAction={vi.fn()} />);
    expect(screen.getByText(/2\/3/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /enviar/i })).not.toBeInTheDocument();
  });

  it('voting: lista opções e vota', async () => {
    const send = vi.fn();
    const proj: DemoProjection = {
      phase: 'voting',
      prompt: 'p',
      options: [
        { optionId: 'o0', text: 'resposta um' },
        { optionId: 'o1', text: 'resposta dois' },
      ],
      yourVote: null,
      voted: 0,
      total: 3,
      endsAt: Date.now() + 60000,
    };
    render(<DemoGameView projection={proj} onAction={send} />);
    await userEvent.click(screen.getByRole('button', { name: /resposta dois/i }));
    expect(send).toHaveBeenCalledWith({ type: 'SUBMIT_VOTE', optionId: 'o1' });
  });

  it('reveal: mostra resultados e placar', () => {
    const proj: DemoProjection = {
      phase: 'reveal',
      prompt: 'p',
      results: [{ nickname: 'Ana', text: 'venceu', votes: 2 }],
      scores: [{ nickname: 'Ana', score: 2 }],
    };
    render(<DemoGameView projection={proj} onAction={vi.fn()} />);
    expect(screen.getByText('venceu')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
  });
});
