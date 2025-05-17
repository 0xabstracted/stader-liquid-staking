import { AnchorProvider, Program } from '@coral-xyz/anchor';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { Connection, PublicKey } from '@solana/web3.js';
import idl from '../../targets/idl/stader_liquid_staking.json';
import { StaderLiquidStaking, IDL } from "../../targets/types/stader_liquid_staking";
import * as dotenv from 'dotenv';
import { loadKeypairFromFile } from '../utils/loadKeypairFromFile';

import { getAssociatedTokenAddressSync } from '@solana/spl-token';
dotenv.config();

if (!process.env.RPC) throw new Error('RPC is not defined');
if (!process.env.RPC_DEVNET) throw new Error('RPC_DEVNET is not defined');
if (!process.env.ADMIN_PATH) throw new Error('ADMIN_PATH is not defined');
if (!process.env.STATE_ACCOUNT_PATH) throw new Error('STATE_ACCOUNT_PATH is not defined');
if (!process.env.STAKE_LIST_PATH) throw new Error('STAKE_LIST_PATH is not defined');
if (!process.env.VALIDATORS_LIST_PATH) throw new Error('VALIDATORS_LIST_PATH is not defined');
if (!process.env.OPERATIONAL_SOL_ACCOUNT_PATH) throw new Error('OPERATIONAL_SOL_ACCOUNT_PATH is not defined');
if (!process.env.STADER_SOL_MINT_PATH) throw new Error('STADER_SOL_MINT_PATH is not defined');
if (!process.env.LP_MINT_PATH) throw new Error('LP_MINT_PATH is not defined');
if (!process.env.CRANKER_PATH) throw new Error('CRANKER_PATH is not defined');

//admin is also the payer for intializing accounts
export const admin = loadKeypairFromFile(process.env.ADMIN_PATH);
export const wallet = new NodeWallet(admin)

// Use the RPC endpoint of your choice.
export const connection = new Connection(process.env.RPC, { commitment: "finalized" })
export const connectionDevnet = new Connection(process.env.RPC_DEVNET, { commitment: "finalized" })


export const provider = new AnchorProvider(connection, wallet, {});
export const providerDevnet = new AnchorProvider(connectionDevnet, wallet, {});

export const contractAddr = new PublicKey(idl.metadata.address)

export const program = new Program<StaderLiquidStaking>(IDL , contractAddr , provider );
export const programDevnet = new Program<StaderLiquidStaking>(IDL , contractAddr , providerDevnet );

export const cranker = loadKeypairFromFile(process.env.CRANKER_PATH);
console.log("Cranker : ", cranker.publicKey.toBase58());

export const stateAccountKeypair = loadKeypairFromFile(process.env.STATE_ACCOUNT_PATH)
export const stakeListKeypair = loadKeypairFromFile(process.env.STAKE_LIST_PATH)
export const validatorsListKeypair = loadKeypairFromFile(process.env.VALIDATORS_LIST_PATH)
export const operationalSolAccountKeypair = loadKeypairFromFile(process.env.OPERATIONAL_SOL_ACCOUNT_PATH)
export const staderSolMintKeypair = loadKeypairFromFile(process.env.STADER_SOL_MINT_PATH)
export const lpMintKeypair = loadKeypairFromFile(process.env.LP_MINT_PATH)
export const stateAccount = stateAccountKeypair.publicKey
export const stakeList = stakeListKeypair.publicKey
export const validatorsList = validatorsListKeypair.publicKey
export const operationalSolAccount = operationalSolAccountKeypair.publicKey
export const staderSolMint = staderSolMintKeypair.publicKey
export const lpMint = lpMintKeypair.publicKey

export const [authorityStaderSolAcc] = PublicKey.findProgramAddressSync([stateAccount.toBuffer(), Buffer.from("st_mint")], contractAddr)
export const [authorityLpAcc] = PublicKey.findProgramAddressSync([stateAccount.toBuffer(), Buffer.from("liq_mint")], contractAddr)
export const [reservePda] = PublicKey.findProgramAddressSync([stateAccount.toBuffer(), Buffer.from("reserve")], contractAddr)
export const [solLegPda] = PublicKey.findProgramAddressSync([stateAccount.toBuffer(), Buffer.from("liq_sol")], contractAddr)
export const [authorityStaderSolLegAcc] = PublicKey.findProgramAddressSync([stateAccount.toBuffer(), Buffer.from("liq_st_sol_authority")], contractAddr);
export const [stakeDepositAuthority] = PublicKey.findProgramAddressSync([stateAccount.toBuffer(), Buffer.from("deposit")], contractAddr)
export const [stakeWithdrawAuthority] = PublicKey.findProgramAddressSync([stateAccount.toBuffer(), Buffer.from("withdraw")], contractAddr);
export const staderSolLeg = getAssociatedTokenAddressSync(staderSolMint, authorityStaderSolLegAcc, true)
export const treasuryStaderSolAccount = getAssociatedTokenAddressSync(staderSolMint, stateAccount, true)
 
export const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
