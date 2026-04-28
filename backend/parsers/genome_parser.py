from __future__ import annotations

from models.schemas import SNPProfile


NOTABLE_SNPS = {"rs9939609", "rs7903146", "rs1801133", "rs429358", "rs7412"}


def parse_23andme(content: bytes) -> SNPProfile:
    text = content.decode("utf-8", errors="ignore")
    snp_count = 0
    notable: dict[str, str] = {}
    for line in text.splitlines():
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        if len(parts) < 4:
            continue
        snp_count += 1
        rsid, _, _, genotype = parts[:4]
        if rsid in NOTABLE_SNPS:
            notable[rsid] = genotype
    return SNPProfile(snp_count=snp_count, notable_snps=notable)
