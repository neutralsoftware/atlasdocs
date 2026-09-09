import { permanentRedirect } from "next/navigation";

export const latest = "beta1";

export default function ToLatest() {
    permanentRedirect(`/${latest}`);
}
