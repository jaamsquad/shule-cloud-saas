import { Bus } from "lucide-react";
import SettingsBuilder, { toggles } from "../communications/SettingsBuilder";

// Transport notification preferences — drive parent alerts on bus pickup/drop.
export default function TransportSettings() {
    return (
        <SettingsBuilder
            title="Transport Settings"
            subtitle="Choose how parents are notified when a student is picked up or dropped"
            icon={Bus}
            collection="transport_settings"
            defaults={{ notifyEmail: false, notifyWhatsapp: true, notifySms: false }}
            sections={[
                {
                    title: "Pickup / Drop Notifications",
                    fields: toggles([
                        ["notifyWhatsapp", "Notify parent via WhatsApp"],
                        ["notifySms", "Notify parent via SMS"],
                        ["notifyEmail", "Notify parent via Email"],
                    ]),
                },
            ]}
        />
    );
}
