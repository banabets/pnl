export type Token = {
    mint: string;
    name: string;
    symbol: string;
    description?: string;
    image_uri?: string;
    market_cap: number;
    usd_market_cap: number;
    creator?: string;
    created_timestamp: number;
    complete: boolean;
};
export default function TokenRowCard({ token, active, onClick, }: {
    token: Token;
    active?: boolean;
    onClick?: () => void;
}): any;
//# sourceMappingURL=TokenRowCard.d.ts.map