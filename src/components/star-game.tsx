import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  Crosshair,
  Heart,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { createGame, INITIAL_HUD, type GameApi, type Hud } from "@/game/engine";

function formatScore(n: number) {
  return n.toLocaleString("zh-CN");
}

export function StarGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<GameApi | null>(null);
  const [hud, setHud] = useState<Hud>(INITIAL_HUD);
  const [name, setName] = useState("雅静");
  const seeded = useRef(false);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const api = createGame(canvas, setHud);
    apiRef.current = api;
    return () => {
      api.destroy();
      apiRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seeded.current && hud.pilot) {
      setName(hud.pilot);
      seeded.current = true;
    }
  }, [hud.pilot]);

  const playing = hud.phase === "play";

  return (
    <div className="game-shell fixed inset-0 overflow-hidden bg-void text-ink">
      <canvas
        ref={canvasRef}
        className={
          playing
            ? "absolute inset-0 block h-full w-full touch-none cursor-none"
            : "absolute inset-0 block h-full w-full touch-none"
        }
      />

      {playing && (
        <>
          <header className="safe-top pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-mist">机体 · 雅静大王</p>
              <p className="text-2xl font-bold tabular-nums text-amber">{formatScore(hud.score)}</p>
              <p className="text-xs text-mist">
                第 {hud.wave} 波 · 剩余 {hud.left}
                {hud.combo > 1 ? <span className="text-amber"> · 连击 x{Math.min(4, hud.combo)}</span> : null}
                {hud.record ? <span className="text-cyan"> · 新纪录</span> : null}
              </p>
            </div>
            <div className="mr-14 text-right">
              <p className="text-xs text-mist">最高</p>
              <p className="text-sm font-bold tabular-nums">{formatScore(hud.best)}</p>
              <div className="mt-2 flex justify-end gap-1" aria-label={`生命 ${hud.hp}`}>
                {Array.from({ length: hud.maxHp }, (_, i) => (
                  <span
                    key={i}
                    className={
                      i < hud.hp
                        ? hud.hp === 1
                          ? "h-2 w-5 rounded-full bg-amber"
                          : "h-2 w-5 rounded-full bg-cyan"
                        : "h-2 w-5 rounded-full bg-line"
                    }
                  />
                ))}
              </div>
            </div>
          </header>
          <div className="safe-top pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-end">
            <button
              type="button"
              className="pointer-events-auto m-3 inline-flex size-11 items-center justify-center rounded-full border border-line bg-panel text-ink"
              aria-label="暂停"
              onClick={() => apiRef.current?.pause()}
            >
              <Pause className="size-5" />
            </button>
          </div>
          <footer className="safe-bottom pointer-events-none absolute inset-x-0 bottom-0 z-10 flex gap-2">
            <Meter
              icon={<Crosshair className="size-4" />}
              label={hud.multi > 1 ? `火力 ${hud.multi}` : "火力 1"}
              active={hud.multi > 1}
              ratio={hud.multi > 1 ? hud.multiT / 14 : 0}
            />
            <Meter
              icon={<Shield className="size-4" />}
              label="护盾"
              active={hud.shieldT > 0}
              ratio={hud.shieldT / 10}
            />
            <Meter
              icon={<Zap className="size-4" />}
              label="加速"
              active={hud.boostT > 0}
              ratio={hud.boostT / 9}
            />
          </footer>
        </>
      )}

      {hud.phase === "menu" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto px-4 py-8 pb-20">
          <section className="w-full max-w-md rounded-card border border-line bg-panel p-5 shadow-2xl">
            <p className="text-xs font-medium tracking-widest text-cyan">YJ-01</p>
            <h1 className="mt-1 text-4xl font-bold">雅静大王</h1>
            <p className="mt-1 text-sm text-mist">俯视突击 · 波次清场</p>
            <ul className="mt-4 space-y-1.5 text-sm text-mist">
              <li>WASD 或方向键移动，指针拖动同样跟手</li>
              <li>自动开火，锁定最近的敌人</li>
              <li>拾取多重射击、护盾与加速</li>
            </ul>
            <div className="mt-4 flex gap-3 text-xs text-mist">
              <span className="inline-flex items-center gap-1">
                <Heart className="size-3.5 text-cyan" /> 五格生命
              </span>
              <span className="inline-flex items-center gap-1">
                <Trophy className="size-3.5 text-amber" /> 本地最高分
              </span>
            </div>
            <ScoreList scores={hud.scores} mark={0} />
            <button
              type="button"
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-card bg-cyan px-4 font-bold text-void"
              onClick={() => apiRef.current?.start()}
            >
              <Play className="size-5" />
              出击
            </button>
          </section>
        </div>
      )}

      {hud.phase === "pause" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-void/70 px-4">
          <section className="w-full max-w-sm rounded-card border border-line bg-panel p-5">
            <h2 className="text-2xl font-bold">已暂停</h2>
            <p className="mt-1 text-sm text-mist">
              第 {hud.wave} 波 · {formatScore(hud.score)} 分
            </p>
            <p className="mt-3 text-sm text-mist">Esc 或 P 继续。移动不影响瞄准，火力会自己找目标。</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-card border border-line px-3 text-sm"
                onClick={() => apiRef.current?.toggleMute()}
              >
                {hud.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                {hud.muted ? "音效关" : "音效开"}
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-card border border-line px-3 text-sm"
                onClick={() => apiRef.current?.toggleShake()}
              >
                震屏{hud.shakeOn ? "开" : "关"}
              </button>
            </div>
            <button
              type="button"
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-card bg-cyan font-bold text-void"
              onClick={() => apiRef.current?.resume()}
            >
              <Play className="size-5" />
              继续
            </button>
            <button
              type="button"
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-card border border-line text-sm"
              onClick={() => apiRef.current?.start()}
            >
              <RotateCcw className="size-4" />
              重新开始
            </button>
            <button
              type="button"
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center text-sm text-mist"
              onClick={() => apiRef.current?.toMenu()}
            >
              返回标题
            </button>
          </section>
        </div>
      )}

      {hud.phase === "over" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto px-4 py-8 pb-20">
          <section className="w-full max-w-md rounded-card border border-line bg-panel p-5">
            <p className="text-xs text-cyan">机体损毁</p>
            <h2 className="mt-1 text-3xl font-bold">雅静大王</h2>
            <p className="mt-2 text-sm text-mist">
              第 {hud.finalWave} 波 ·{" "}
              <span className="font-bold text-amber tabular-nums">{formatScore(hud.score)}</span> 分
              {hud.record ? " · 新纪录" : ""}
            </p>
            <label className="mt-4 block text-xs text-mist" htmlFor="pilot-name">
              呼号
            </label>
            <input
              id="pilot-name"
              value={name}
              maxLength={8}
              autoComplete="off"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  apiRef.current?.submitScore(name);
                }
              }}
              className="mt-1 w-full rounded-card border border-line bg-void px-3 py-3 text-ink"
            />
            <button
              type="button"
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-card border border-line text-sm"
              onClick={() => apiRef.current?.submitScore(name)}
            >
              记入最高分榜
            </button>
            <ScoreList scores={hud.scores} mark={hud.scoreAt} />
            <button
              type="button"
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-card bg-cyan font-bold text-void"
              onClick={() => {
                apiRef.current?.submitScore(name);
                apiRef.current?.start();
              }}
            >
              <RotateCcw className="size-5" />
              再来一局
            </button>
            <button
              type="button"
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center text-sm text-mist"
              onClick={() => apiRef.current?.toMenu()}
            >
              返回标题
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

function Meter({
  icon,
  label,
  active,
  ratio,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  ratio: number;
}) {
  return (
    <div className={active ? "min-w-24 rounded-card border border-line bg-panel/90 px-2 py-1.5 text-ink" : "min-w-24 rounded-card border border-line bg-panel/70 px-2 py-1.5 text-mist"}>
      <div className="flex items-center gap-1 text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-line">
        <div className="h-full bg-cyan" style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%` }} />
      </div>
    </div>
  );
}

function ScoreList({ scores, mark }: { scores: Hud["scores"]; mark: number }) {
  return (
    <div className="mt-4">
      <h2 className="flex items-center gap-1 text-sm font-bold">
        <Trophy className="size-4 text-amber" />
        最高分榜
      </h2>
      {scores.length === 0 ? (
        <p className="mt-2 text-sm text-mist">还没有战绩，出击成为第一。</p>
      ) : (
        <ol className="mt-2 space-y-1">
          {scores.map((row, i) => (
            <li
              key={row.at}
              className={
                row.at === mark
                  ? "flex items-center justify-between rounded-md bg-void px-2 py-1 text-sm text-cyan"
                  : "flex items-center justify-between px-2 py-1 text-sm"
              }
            >
              <span className="text-mist">{i + 1}</span>
              <span className="flex-1 truncate px-2">{row.name}</span>
              <span className="text-mist">第{row.wave}波</span>
              <span className="w-20 text-right font-bold tabular-nums text-amber">{formatScore(row.score)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
