-- Escrow deals created on the JoyTradeEscrow smart contract
CREATE TABLE escrow_deals (
                              id              BIGSERIAL PRIMARY KEY,

    -- On-chain deal id from JoyTradeEscrow
                              deal_id         BIGINT      NOT NULL,

    -- Optional link to your marketplace order
                              order_id        BIGINT,

    -- Wallet addresses on-chain (we keep as plain text, no FK for now)
                              buyer_address   VARCHAR(255) NOT NULL,
                              seller_address  VARCHAR(255) NOT NULL,

    -- Token used (USDT for now, but we keep it flexible)
                              token_address   VARCHAR(255) NOT NULL,

    -- Amount in wei (big integer as text/number)
                              amount_wei      NUMERIC(78, 0) NOT NULL,

    -- Platform fee in basis points (e.g. 150 = 1.5%)
                              fee_bps         INTEGER     NOT NULL,

    -- Status: OPEN, FUNDED, RELEASED, REFUNDED, CANCELED
                              status          VARCHAR(32) NOT NULL,

    -- Optional tx hashes for audit
                              created_tx_hash   VARCHAR(100),
                              funded_tx_hash    VARCHAR(100),
                              released_tx_hash  VARCHAR(100),
                              refunded_tx_hash  VARCHAR(100),

                              created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
                              updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_escrow_deals_deal_id  ON escrow_deals(deal_id);
CREATE INDEX idx_escrow_deals_order_id ON escrow_deals(order_id);
