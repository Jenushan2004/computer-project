import { forwardRef, useImperativeHandle, useState } from "react";
import { buildSecurePassword } from "../utils/password";

const DEFAULT_OPTS = {
  length: 16,
  lower: true,
  upper: true,
  numbers: true,
  symbols: true,
  excludeSimilar: true,
  requireEach: true,
  noRepeat: false,
};

const PasswordGenerator = forwardRef(function PasswordGenerator(_props, ref) {
  const [opts, setOpts] = useState(DEFAULT_OPTS);
  const [output, setOutput] = useState("—");
  const [meta, setMeta] = useState("");
  const [hint, setHint] = useState("");
  const [toast, setToast] = useState("");

  const generate = () => {
    try {
      const result = buildSecurePassword(opts);
      setOutput(result.password);
      setMeta(`${result.strength} · ~${result.entropy} bits · pool ${result.poolSize}`);
      setHint(result.hint || "");
      return result.password;
    } catch (err) {
      setOutput("—");
      setMeta("");
      setHint(err.message);
    }
  };

  useImperativeHandle(ref, () => ({ generate }));

  const copy = async () => {
    if (!output || output === "—") return;
    try {
      await navigator.clipboard.writeText(output);
      setToast("Copied!");
      setTimeout(() => setToast(""), 2000);
    } catch {
      setToast("Copy failed");
    }
  };

  const toggle = (key) => setOpts({ ...opts, [key]: !opts[key] });

  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <span className="eyebrow green">Crypto Secure</span>
          <h2>Password Generator</h2>
        </div>
      </header>
      <div className="panel-body">
        <label className="field">
          Length: {opts.length}
          <input
            type="range"
            min={6}
            max={128}
            value={opts.length}
            onChange={(e) => setOpts({ ...opts, length: +e.target.value })}
          />
        </label>
        <div className="toggle-row">
          {["lower", "upper", "numbers", "symbols"].map((k) => (
            <label key={k} className="chip">
              <input type="checkbox" checked={opts[k]} onChange={() => toggle(k)} /> {k}
            </label>
          ))}
        </div>
        <div className="toggle-row">
          <label className="chip">
            <input type="checkbox" checked={opts.excludeSimilar} onChange={() => toggle("excludeSimilar")} /> No similar
          </label>
          <label className="chip">
            <input type="checkbox" checked={opts.requireEach} onChange={() => toggle("requireEach")} /> Require each
          </label>
          <label className="chip">
            <input type="checkbox" checked={opts.noRepeat} onChange={() => toggle("noRepeat")} /> No repeats
          </label>
        </div>
        <div className="pw-output">
          <code>{output}</code>
          <button type="button" className="btn btn-ghost btn-sm" onClick={copy}>
            Copy
          </button>
        </div>
        {meta && <p className="meta">{meta}</p>}
        {hint && <p className="hint">{hint}</p>}
        {toast && <p className="toast-inline">{toast}</p>}
        <button type="button" className="btn btn-primary full" onClick={generate}>
          Generate Password
        </button>
      </div>
    </section>
  );
});

export default PasswordGenerator;
