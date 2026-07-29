import Item from "sap/ui/core/Item";
import ComboBox from "sap/m/ComboBox";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import Context from "sap/ui/model/odata/v4/Context";

/**
 * @namespace sap.capire.gameshop.utils
 */
export default class CategorySorter {

    /**
     * @param oComboBox Instance of dropdown
     */
    public static initAndLoad(oComboBox: ComboBox): void {
        if (!oComboBox) return;

        oComboBox.bindItems({
            path: "/Categories",
            parameters: {
                "$select": "ID,name,parent_ID",
                "$expand": "parent($select=name)"
            },
            template: new Item({ key: "{ID}", text: "{name}" }),
            events: {

                dataReceived: () => {
                    const oBinding = oComboBox.getBinding("items") as ODataListBinding;
                    if (!oBinding) return;

                    const aContexts = oBinding.getContexts();
                    const aRawCategories = aContexts
                        .map((oCtx: Context) => oCtx.getObject())
                        .filter(oObj => !!oObj);

                    CategorySorter.rebuildItems(oComboBox, aRawCategories);
                }
            }
        });
    }

    private static rebuildItems(oComboBox: ComboBox, aRawCategories: any[]): void {
        const aParents = aRawCategories
            .filter((c: any) => !c.parent_ID)
            .sort((a: any, b: any) => a.name.localeCompare(b.name));

        const aResult = [...aParents];

        const aChildren = aRawCategories
            .filter((c: any) => !!c.parent_ID)
            .sort((a: any, b: any) => a.name.localeCompare(b.name));

        aChildren.forEach((oChild: any) => {
            const iParentIndex = aResult.findIndex((c: any) => c.ID === oChild.parent_ID);
            if (iParentIndex !== -1) {
                let iInsertIndex = iParentIndex + 1;
                while (iInsertIndex < aResult.length && aResult[iInsertIndex].parent_ID === oChild.parent_ID) {
                    iInsertIndex++;
                }
                aResult.splice(iInsertIndex, 0, oChild);
            } else {
                aResult.push(oChild);
            }
        });


        oComboBox.destroyItems();

        aResult.forEach((oCat: any) => {
            const sFormattedText = oCat.parent_ID ? `    └── ${oCat.name}` : oCat.name;
            oComboBox.addItem(new Item({ key: oCat.ID, text: sFormattedText }));
        });
    }
}
