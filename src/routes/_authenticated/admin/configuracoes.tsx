import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageContent, PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getPlataformaConfig, updatePlataformaConfig } from "@/lib/config.functions";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Admin J&D" }] }),
  component: Configuracoes,
});

function Configuracoes() {
  const getFn = useServerFn(getPlataformaConfig);
  const updateFn = useServerFn(updatePlataformaConfig);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["config"], queryFn: () => getFn() });
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (q.data) setForm(q.data);
  }, [q.data]);

  const mut = useMutation({
    mutationFn: () => {
      const { id, updated_at, updated_by, ...rest } = form ?? {};
      return updateFn({ data: rest });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["config"] });
      toast.success("Configurações salvas.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bind = (k: string) => ({
    value: form?.[k] ?? "",
    onChange: (e: any) => setForm({ ...form, [k]: e.target.value }),
  });

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Identidade e informações institucionais da plataforma."
        actions={
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            Salvar alterações
          </Button>
        }
      />
      <PageContent>
        <div className="grid max-w-4xl gap-6">
          <Section title="Identidade">
            <Row>
              <Field label="Nome da plataforma"><Input {...bind("nome_plataforma")} /></Field>
              <Field label="Nome curto"><Input {...bind("nome_curto")} /></Field>
            </Row>
            <Row>
              <Field label="URL do logotipo"><Input {...bind("logo_url")} placeholder="https://…" /></Field>
              <Field label="URL do favicon"><Input {...bind("favicon_url")} placeholder="https://…" /></Field>
            </Row>
          </Section>

          <Section title="Contato">
            <Row>
              <Field label="E-mail de contato"><Input type="email" {...bind("email_contato")} /></Field>
              <Field label="Telefone"><Input {...bind("telefone")} /></Field>
            </Row>
            <Row>
              <Field label="WhatsApp"><Input {...bind("whatsapp")} placeholder="https://wa.me/…" /></Field>
              <Field label="URL de regularização (Hotmart)">
                <Input {...bind("hotmart_regularizacao_url")} placeholder="https://…" />
              </Field>
            </Row>
          </Section>

          <Section title="Redes sociais">
            <Row>
              <Field label="Instagram"><Input {...bind("instagram_url")} /></Field>
              <Field label="Facebook"><Input {...bind("facebook_url")} /></Field>
            </Row>
            <Row>
              <Field label="YouTube"><Input {...bind("youtube_url")} /></Field>
              <Field label="LinkedIn"><Input {...bind("linkedin_url")} /></Field>
            </Row>
          </Section>

          <Section title="Textos institucionais">
            <Field label="Sobre o instituto">
              <Textarea rows={4} {...bind("sobre")} />
            </Field>
            <Field label="Texto do rodapé">
              <Textarea rows={2} {...bind("texto_rodape")} />
            </Field>
          </Section>
        </div>
      </PageContent>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="surface-card p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
