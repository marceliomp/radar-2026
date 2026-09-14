import { publicPollSource, type SourcePoll } from "./poll-citation";

export function PublicPollSource({ poll, locale }: { poll: SourcePoll; locale: "pt" | "en" }) {
  const { url, protocol } = publicPollSource(poll);
  return <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
    {protocol && <span>TSE {protocol}</span>}
    {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-primary underline underline-offset-4">{locale === "en" ? "Read source" : "Consultar fonte"}</a> : <span>{locale === "en" ? "Source link not recorded" : "Link da fonte não registrado"}</span>}
  </div>;
}
