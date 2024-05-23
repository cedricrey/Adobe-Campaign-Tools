Link dtails intoo Shcema edition
see https://experienceleague.adobe.com/en/docs/campaign-classic/using/configuring-campaign-classic/schema-reference/database-links for more details

Link types :
  - 0 or 1 ![plot](https://experienceleague.adobe.com/en/docs/campaign-classic/using/configuring-campaign-classic/schema-reference/media_12d08138465b8d91d7b04b1ee2187001e4b9c3b5a.png?width=2000&format=webply&optimize=medium)  (cardinality=2 in enrich activity) : type="link" and must set exterenalJoin="true" in the element link
  - 1 - 1 ![plot](https://experienceleague.adobe.com/en/docs/campaign-classic/using/configuring-campaign-classic/schema-reference/media_188aabee1b920a41a8c4388bc93dd4f0c61b9382b.png?width=2000&format=webply&optimize=medium) (cardinality=1 in enrich activity) : just a simple type="link"
  - 1-N ![plot](https://experienceleague.adobe.com/en/docs/campaign-classic/using/configuring-campaign-classic/schema-reference/media_1497560a2e3d62565e674607cdfbca44532afdd6d.png?width=2000&format=webply&optimize=medium) (cardinality=0 in enrich activity) : a collection. unbound="true"

