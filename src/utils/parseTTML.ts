function parseTimeToMs(timeStr: string): number {
    if (!timeStr) return 0;

    function normSec(s: string) {
        const dot = s.indexOf(".");
        if (dot === -1) return parseFloat(s);
        const frac = s.slice(dot + 1);
        if (frac.length === 2) {
            return parseFloat(s.slice(0, dot + 1) + "0" + frac);
        }
        return parseFloat(s);
    }

    const parts = timeStr.split(":");
    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    if (parts.length === 3) {
        hours = parseFloat(parts[0]);
        minutes = parseFloat(parts[1]);
        seconds = normSec(parts[2]);
    } else if (parts.length === 2) {
        minutes = parseFloat(parts[0]);
        seconds = normSec(parts[1]);
    } else if (parts.length === 1) {
        seconds = normSec(parts[0]);
    }

    return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

function parseTTML(ttmlString: string): any {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(ttmlString, "text/html");
    const lines: any[] = [];
    let pElements = Array.from(xmlDoc.getElementsByTagName("p")) as Element[];
    if (pElements.length === 0) {
      pElements = Array.from(xmlDoc.querySelectorAll("*")).filter(
        (el) => el.localName === "p",
      ) as Element[];
    }
    pElements.forEach((p) => {
        const begin = p.getAttribute("begin");
        if(!begin) return;
        const end = p.getAttribute("end");
        const text = p.textContent
        .replace(/[\n\r\t]/g, " ")
        .replace(/\s+/g, " ")
        .trim() || "";
        const startTimeMs = parseTimeToMs(begin);
        const endTimeMs = end ? parseTimeToMs(end) : startTimeMs + 4000;

        lines.push({
            startTimeMs,
            endTimeMs,
            text,
        });
    });
    return lines;
}

export { parseTTML };