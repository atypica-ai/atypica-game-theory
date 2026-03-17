"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CopyIcon,
  DownloadIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground/60">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
    </div>
  );
}

export default function AdminUIComponentsPage() {
  const [switchOn, setSwitchOn] = useState(true);
  const [checked, setChecked] = useState(true);

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-base font-semibold">Component Library</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Raw UI components with default styles. No extra className overrides.
        </p>
      </div>

      {/* ── Button ── */}
      <Section title="Button">
        <Row label="default">
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon"><PlusIcon /></Button>
        </Row>
        <Row label="primary">
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary">Primary</Button>
          <Button variant="primary" size="lg">Large</Button>
          <Button variant="primary" size="icon"><PlusIcon /></Button>
        </Row>
        <Row label="secondary">
          <Button variant="secondary" size="sm">Small</Button>
          <Button variant="secondary">Default</Button>
        </Row>
        <Row label="outline">
          <Button variant="outline" size="sm"><DownloadIcon /> Export</Button>
          <Button variant="outline">Outline</Button>
        </Row>
        <Row label="ghost">
          <Button variant="ghost" size="sm">Ghost</Button>
          <Button variant="ghost" size="icon"><SettingsIcon /></Button>
        </Row>
        <Row label="destructive">
          <Button variant="destructive" size="sm"><Trash2Icon /> Delete</Button>
          <Button variant="destructive">Destructive</Button>
        </Row>
        <Row label="link">
          <Button variant="link">Link variant</Button>
        </Row>
        <Row label="disabled">
          <Button disabled>Default</Button>
          <Button variant="primary" disabled>Primary</Button>
          <Button variant="outline" disabled>Outline</Button>
        </Row>
      </Section>

      <Separator />

      {/* ── Badge ── */}
      <Section title="Badge">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </Section>

      <Separator />

      {/* ── Card ── */}
      <Section title="Card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Card Title</CardTitle>
              <CardDescription>Card description text.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Card content with default padding and gap.</p>
            </CardContent>
            <CardFooter>
              <Button size="sm">Action</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Minimal Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No description, no footer.</p>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Separator />

      {/* ── Input & Textarea ── */}
      <Section title="Input & Textarea">
        <div className="space-y-3 max-w-md">
          <Input placeholder="Default input" />
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" />
            <Input placeholder="With search icon" className="pl-8" />
          </div>
          <Input disabled placeholder="Disabled input" />
          <Textarea placeholder="Default textarea" />
          <Textarea disabled placeholder="Disabled textarea" />
        </div>
      </Section>

      <Separator />

      {/* ── Select ── */}
      <Section title="Select">
        <div className="flex items-center gap-3">
          <Select defaultValue="opt1">
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="opt1">Option One</SelectItem>
              <SelectItem value="opt2">Option Two</SelectItem>
              <SelectItem value="opt3">Option Three</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="sm">
            <SelectTrigger size="sm" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Size: sm</SelectItem>
              <SelectItem value="default">Size: default</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Section>

      <Separator />

      {/* ── Checkbox & Switch ── */}
      <Section title="Checkbox & Switch">
        <div className="flex items-center gap-8">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} />
            Checked
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox />
            Unchecked
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox disabled />
            Disabled
          </label>
        </div>
        <div className="flex items-center gap-8 mt-2">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
            {switchOn ? "On" : "Off"}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch disabled />
            Disabled
          </label>
        </div>
      </Section>

      <Separator />

      {/* ── Tabs ── */}
      <Section title="Tabs">
        <Tabs defaultValue="t1">
          <TabsList>
            <TabsTrigger value="t1">Tab One</TabsTrigger>
            <TabsTrigger value="t2">Tab Two</TabsTrigger>
            <TabsTrigger value="t3">Tab Three</TabsTrigger>
          </TabsList>
          <TabsContent value="t1">
            <p className="text-sm text-muted-foreground pt-2">Content for tab one.</p>
          </TabsContent>
          <TabsContent value="t2">
            <p className="text-sm text-muted-foreground pt-2">Content for tab two.</p>
          </TabsContent>
        </Tabs>
      </Section>

      <Separator />

      {/* ── Tooltip ── */}
      <Section title="Tooltip">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm"><CopyIcon /> Hover me</Button>
          </TooltipTrigger>
          <TooltipContent>Uses bg-foreground, not primary</TooltipContent>
        </Tooltip>
      </Section>

      <Separator />

      {/* ── Progress ── */}
      <Section title="Progress">
        <div className="space-y-2 max-w-md">
          <Progress value={0} />
          <Progress value={33} />
          <Progress value={66} />
          <Progress value={100} />
        </div>
      </Section>
    </div>
  );
}
