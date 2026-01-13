import { Token } from './TokenRowCard';
export default function TrenchesBoard({ columns, selectedMint, onSelect, }: {
    columns: {
        left: Token[];
        mid: Token[];
        right: Token[];
    };
    selectedMint?: string;
    onSelect: (t: Token) => void;
}): any;
//# sourceMappingURL=TrenchesBoard.d.ts.map