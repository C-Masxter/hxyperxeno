import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PageShell } from "@/components/Page";
export const Route = createFileRoute("/credits")({ component: () => (<><PageHeader page="credits" eyebrow="CREDITS" fallbackTitle="Credits" fallbackBody="Built by the HYPER XENO collective. Special thanks to the open security community." /><PageShell><div className="glass rounded-2xl p-10 text-muted-foreground space-y-2"><div>— Engineering: HX Core Team</div><div>— Design: HX Studio</div><div>— Threat Intel: Global community partners</div></div></PageShell></>) });
