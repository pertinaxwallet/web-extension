<script>
  import { onMount, getContext } from "svelte";
  import { fade } from "svelte/transition";
  import { _ } from "svelte-i18n";

  //Components
  import Loading from "../../Elements/Loading.svelte";

  import {
    accountStore,
    currentAccount,
    currentNetwork,
  } from "../../../common/stores.js";

  import {
    fromDecimal,
  } from "../../../common/utils.js";

  //Stores
  import { Checkbox, Field, Button } from "svelte-chota";

  //Context
  const { switchPage } = getContext("app_functions");

  //DOM nodes
  let formObj;

  let assetsLoaded = false;
  let assets = [];
  let selectedList = [];

  const getTokenList = (accountAddress, server) => {
    browser.runtime
      .sendMessage({
        type: "tokenList",
        data: {
          accountAddress: accountAddress,
          server: server,
        },
      })
      .then((result) => {
        assets = result;
        assetsLoaded = true;
      })
      .catch((e) => {
        console.log(e); // here don't need to show any error for user, usually it is the network issue in the development environment
      });
  };

  onMount(() => {
    getTokenList($currentAccount.address, $currentNetwork.server);
  });

  const handleSubmit = async () => {
    try {
      if (formObj.checkValidity()) {
        browser.runtime
          .sendMessage({
            type: "removeTokens",
            data: selectedList,
          })
          .then((result) => {
            if (!result.error) {
              switchPage("AccountMain");
            } else {
              error = result.error;
            }
          });
      }
    } catch (e) {
      formObj.reportValidity();
    }
  };

  const goBack = () => {
    switchPage("AccountMain");
  };
</script>

<style lang="scss">
  .tokens-wrapper {
    max-height: 30rem;
    overflow: hidden;
    .tokens-wrapper-scroll {
      max-height: 30rem;
      overflow-y: auto;
      width: calc(100% + 20px);
    }
  }
  .token-image {
    width: 3rem;
    height: 3rem;
    vertical-align: bottom;
  }
</style>

<h6>{$_('Manage tokens')}</h6>

<form
  id="manage-tokens-form"
  on:submit|preventDefault={() => handleSubmit()}
  target="_self"
  bind:this={formObj}>
  <div class="tokens-wrapper">
    <div class="tokens-wrapper-scroll">
      {#each assets as assetItem}
        <Field>
          <Checkbox name="selected-asset" value="{assetItem.address}" bind:group={selectedList}>
            <span>
              <img
                alt=""
                class="token-image"
                src={typeof assetItem.icon != 'undefined' && assetItem.icon != '' ? assetItem.icon : '/assets/img/icon-token-128.png'}
              />
              {fromDecimal(assetItem.balance, assetItem.decimals)}
              &nbsp;
              <span title={assetItem.name}>{assetItem.symbol}</span>
              &nbsp; ({$_('Type')}
              &nbsp;
              {assetItem.type})
            </span>
          </Checkbox>
        </Field>
      {/each}
    </div>
  </div>
  {#if !assetsLoaded}
    <Loading/>
  {:else}
    {#if assets.length > 0}
      <div class="flex-column flow-buttons">
        <Button
          form="manage-tokens-form"
          class="button__solid button__primary submit-button submit-button-text submit"
          style="margin: 0 0 1rem;"
          type="submit">
          {$_('Delete selected assets')}
        </Button>
        <Button
          id="back"
          class="flex-row flex-center-centr button__solid button"
          style="margin: 0 0 1rem;"
          on:click={() => goBack()}>
          {$_('Back')}
        </Button>
      </div>
    {:else}
      {$_('No tokens that you can remove')}
    {/if}
  {/if}
</form>
