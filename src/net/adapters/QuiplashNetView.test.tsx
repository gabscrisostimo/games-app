import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuiplashNetView } from './QuiplashNetView';
import type { QuiplashProjection } from './quiplash';

const FUTURE = () => Date.now() + 60_000;

describe('QuiplashNetView — answering', () => {
  const answering = (
    prompts: { matchupIndex: number; promptText: string; yourText: string }[],
    submitted = false,
  ): QuiplashProjection => ({
    phase: 'answering',
    prompts,
    submitted,
    answeredCount: 1,
    total: 3,
    endsAt: FUTURE(),
  });

  it('mostra todos os prompts do jogador e um campo por prompt', () => {
    render(
      <QuiplashNetView
        projection={answering([
          { matchupIndex: 0, promptText: 'Pior nome pra um cachorro', yourText: '' },
          { matchupIndex: 2, promptText: 'O que não dizer num casamento', yourText: '' },
        ])}
        onAction={vi.fn()}
      />,
    );
    expect(screen.getByText('Pior nome pra um cachorro')).toBeInTheDocument();
    expect(screen.getByText('O que não dizer num casamento')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
  });

  it('Enviar fica desabilitado até todos os campos preenchidos; envia os textos na ordem', async () => {
    const onAction = vi.fn();
    render(
      <QuiplashNetView
        projection={answering([
          { matchupIndex: 0, promptText: 'P1', yourText: '' },
          { matchupIndex: 2, promptText: 'P2', yourText: '' },
        ])}
        onAction={onAction}
      />,
    );
    const enviar = screen.getByRole('button', { name: /enviar/i });
    expect(enviar).toBeDisabled();
    const boxes = screen.getAllByRole('textbox');
    await userEvent.type(boxes[0], 'resp A');
    expect(enviar).toBeDisabled(); // ainda falta o 2º
    await userEvent.type(boxes[1], 'resp B');
    expect(enviar).toBeEnabled();
    await userEvent.click(enviar);
    expect(onAction).toHaveBeenCalledWith({ type: 'SUBMIT_ANSWERS', texts: ['resp A', 'resp B'] });
  });

  it('depois de enviado some o formulário e mostra estado de espera', () => {
    render(
      <QuiplashNetView projection={answering([{ matchupIndex: 0, promptText: 'P1', yourText: 'já respondi' }], true)} onAction={vi.fn()} />,
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText(/esperando/i)).toBeInTheDocument();
  });
});

describe('QuiplashNetView — voting', () => {
  type VotingProj = Extract<QuiplashProjection, { phase: 'voting' }>;
  const voting = (ballots: VotingProj['ballots']): QuiplashProjection => ({
    phase: 'voting',
    ballots,
    votedCount: 0,
    totalBallots: ballots.length,
    endsAt: FUTURE(),
  });

  it('mostra a cédula pendente com prompt e opções, e vota pelo índice (choice)', async () => {
    const onAction = vi.fn();
    render(
      <QuiplashNetView
        projection={voting([
          {
            matchupIndex: 1,
            promptText: 'Melhor desculpa pra faltar',
            options: [
              { choice: 0, text: 'Tô doente' },
              { choice: 1, text: 'Meu peixe morreu' },
            ],
            yourChoice: null,
          },
        ])}
        onAction={onAction}
      />,
    );
    expect(screen.getByText('Melhor desculpa pra faltar')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Meu peixe morreu' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'CAST_VOTE', matchupIndex: 1, choice: 1 });
  });

  it('cédula já votada não mostra botões clicáveis de opção', () => {
    render(
      <QuiplashNetView
        projection={voting([
          {
            matchupIndex: 1,
            promptText: 'P',
            options: [
              { choice: 0, text: 'A' },
              { choice: 1, text: 'B' },
            ],
            yourChoice: 0,
          },
        ])}
        onAction={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: 'A' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'B' })).not.toBeInTheDocument();
  });
});

describe('QuiplashNetView — resultados', () => {
  it('round-result mostra placar e botão Próxima rodada (NEXT_ROUND)', async () => {
    const onAction = vi.fn();
    render(
      <QuiplashNetView
        projection={{
          phase: 'round-result',
          multiplier: 2,
          isLastLash: false,
          results: [
            {
              promptText: 'P',
              tallies: [
                { authorId: 'a', text: 'resp da Ana', votes: 2, points: 4000, quiplash: true },
                { authorId: 'b', text: 'resp da Bia', votes: 0, points: 0, quiplash: false },
              ],
            },
          ],
          ranking: [
            { id: 'a', name: 'Ana', score: 4000 },
            { id: 'b', name: 'Bia', score: 0 },
          ],
        }}
        onAction={onAction}
      />,
    );
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('4000')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /próxima rodada/i }));
    expect(onAction).toHaveBeenCalledWith({ type: 'NEXT_ROUND' });
  });

  it('final-result mostra ranking e botão Jogar de novo (PLAY_AGAIN)', async () => {
    const onAction = vi.fn();
    render(
      <QuiplashNetView
        projection={{
          phase: 'final-result',
          ranking: [
            { id: 'a', name: 'Ana', score: 9000 },
            { id: 'b', name: 'Bia', score: 3000 },
          ],
        }}
        onAction={onAction}
      />,
    );
    expect(screen.getByText('Resultado final')).toBeInTheDocument();
    expect(screen.getByText('Vencedor')).toBeInTheDocument();
    expect(screen.getAllByText('Ana').length).toBeGreaterThan(0); // destaque + ranking
    await userEvent.click(screen.getByRole('button', { name: /jogar de novo/i }));
    expect(onAction).toHaveBeenCalledWith({ type: 'PLAY_AGAIN' });
  });
});
