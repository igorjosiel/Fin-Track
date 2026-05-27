export interface ITransaction {
    id: string;
    title: string;
    amount: number;
    created_at: string;
    session_id?: string;
}
