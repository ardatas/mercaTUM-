import * as Context from "@radix-ui/react-context-menu";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
export interface MenuAction {
  label: string;
  run: () => void;
  disabled?: boolean;
}
export function ContextActions({
  children,
  actions,
}: {
  children: ReactNode;
  actions: MenuAction[];
}) {
  return (
    <Context.Root>
      <Context.Trigger asChild>{children}</Context.Trigger>
      <Context.Portal>
        <Context.Content className="context-menu">
          {actions.map((a) => (
            <Context.Item key={a.label} disabled={a.disabled} onSelect={a.run}>
              {a.label}
            </Context.Item>
          ))}
        </Context.Content>
      </Context.Portal>
    </Context.Root>
  );
}
export function ActionMenu({
  actions,
  label = "More actions",
}: {
  actions: MenuAction[];
  label?: string;
}) {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger className="icon-button" aria-label={label}>
        <MoreHorizontal size={17} />
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content className="context-menu" align="end">
          {actions.map((a) => (
            <Dropdown.Item key={a.label} disabled={a.disabled} onSelect={a.run}>
              {a.label}
            </Dropdown.Item>
          ))}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
