// Réplica visual de .marca/.selo/.nome (components/nav/SiteNav.tsx, styles/lp.css)
// em Tailwind — o admin não carrega styles/lp.css, então não dá pra reusar as
// classes direto.
export function Marca() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative flex h-8 w-8 flex-none items-center justify-center border-[1.5px] border-[var(--abissal)] text-sm text-[var(--abissal)] [font-family:var(--display),serif]">
        RT
        <span className="absolute -bottom-[3px] -right-[3px] h-[7px] w-[7px] bg-[var(--bronze)]" />
      </span>
      <span className="leading-tight">
        <span className="block text-[13.5px] font-semibold text-[var(--abissal)]">
          Rafael Teixeira
        </span>
        <span className="block [font-family:var(--mono),monospace] text-[10px] font-normal uppercase tracking-[0.22em] text-[var(--jade)]">
          Capital Imobiliário
        </span>
      </span>
    </div>
  );
}
