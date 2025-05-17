import { 
    connectionDevnet as connection, 
    // connection,
    admin, 
    stateAccountKeypair, 
    staderSolMint, 
    lpMint 
} from "../../../config";
import { update_stader_sol_token_metadata, update_lp_mint_token_metadata } from "../../../instructions/baseInstructions/admin";
import { UpdateStaderSolTokenMetadata } from "../../../types/basicInstructionTypes/admin";
import { UpdateLpMintTokenMetadata } from "../../../types/basicInstructionTypes/admin";

export const update_stader_sol_and_lp_mint_token_metadata = async () => {
    
    const updateStaderSolTokenMetadataData: UpdateStaderSolTokenMetadata = {
        stateAccount: stateAccountKeypair,
        staderSolMint: staderSolMint,
        name: "Stader Staked SOL",
        symbol: "staderSOL",
        uri: "https://staderlabs.s3.ap-south-1.amazonaws.com/staderStakedSol.json",
    }
    await update_stader_sol_token_metadata(connection, admin, updateStaderSolTokenMetadataData)


    const updateLpMintTokenMetadataData: UpdateLpMintTokenMetadata = {
        stateAccount: stateAccountKeypair,
        lpMint: lpMint,
        name: "Stader Staked SOL LP",
        symbol: "staderLP",
        uri: "https://staderlabs.s3.ap-south-1.amazonaws.com/staderStakedSolLP.json"
    }
    await update_lp_mint_token_metadata(connection, admin, updateLpMintTokenMetadataData)
}

update_stader_sol_and_lp_mint_token_metadata()