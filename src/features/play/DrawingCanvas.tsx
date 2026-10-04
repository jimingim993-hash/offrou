import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { Actions, Lead, PlayButton } from './parts';
import styles from './play.module.css';

/**
 * 공통 낙서 캔버스 (PLAY 1분 낙서 · HOBBY 드로잉/관찰 스케치).
 * 그리기 · 전체 지우기 · 다시 시작 · 완료만. 그림은 어디에도 저장·업로드하지 않는다.
 * 마우스·터치·펜 모두 Pointer Events 하나로 처리하고, 선 색은 테마 글자색을 따른다.
 */
export function DrawingCanvas({
  onRestart,
  onDone,
  doneLabel = '다 그렸어',
}: {
  onRestart: () => void;
  onDone: () => void;
  doneLabel?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawing, setHasDrawing] = useState(false);

  const context = () => {
    try {
      return canvasRef.current?.getContext('2d') ?? null;
    } catch {
      return null;
    }
  };

  /** 화면 크기·화질(devicePixelRatio)에 맞춰 캔버스를 준비한다. 선 색은 현재 테마 글자색 */
  const setup = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const ctx = context();
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = getComputedStyle(canvas).color || '#333';
  }, []);

  useEffect(() => {
    setup();
  }, [setup]);

  const point = (e: PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drawing.current = true;
    last.current = point(e);
    const ctx = context();
    if (ctx) {
      // 점 하나만 찍어도 보이게
      ctx.beginPath();
      ctx.arc(last.current.x, last.current.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    }
    setHasDrawing(true);
  };

  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const p = point(e);
    const ctx = context();
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    last.current = p;
  };

  const up = () => {
    drawing.current = false;
    last.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = context();
    if (canvas && ctx) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
    setHasDrawing(false);
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label={hasDrawing ? '낙서하는 캔버스 (그린 선이 있어)' : '낙서하는 캔버스 (아직 비어 있어)'}
        data-has-drawing={hasDrawing || undefined}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={up}
      >
        손가락이나 마우스로 그리는 캔버스야. 그리기 어렵다면 종이에 그려도 좋아.
      </canvas>
      <p className={styles.hint}>그림은 저장되지 않아. 종이에 그려도 괜찮아.</p>
      <Lead>잘 그릴 필요 없어. 손이 가는 대로.</Lead>
      <Actions>
        <PlayButton onClick={onDone}>{doneLabel}</PlayButton>
        <PlayButton variant="ghost" onClick={clear} disabled={!hasDrawing}>
          전체 지우기
        </PlayButton>
        <PlayButton
          variant="quiet"
          onClick={() => {
            clear();
            onRestart();
          }}
        >
          다시 시작
        </PlayButton>
      </Actions>
    </>
  );
}
