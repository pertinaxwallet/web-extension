<script>
  import { getContext, onMount, onDestroy, afterUpdate } from "svelte";
  import { Icon, Button } from "svelte-chota";
  import { _ } from "svelte-i18n";

  /* Icons https://materialdesignicons.com/ */
  import { mdiNetwork, mdiPlus } from "@mdi/js";

  //Stores
  import { currentNetwork, networksStore } from "../../common/stores.js";

  //Context
  const { switchPage } = getContext("app_functions");

  let server = "localhost:7777";
  let allNetworks = [];

  const updateAllNetworks = () => {
    browser.runtime
      .sendMessage({ type: "getAllNetworks", data: {} })
      .then((result) => {
        allNetworks = result;
        const network = allNetworks.filter(
          (item) => item.server == $currentNetwork.server
        )[0];
      });
  };

  onMount(() => {
    updateAllNetworks();
  });

  const updateNetworksListener = (message) => {
    if (message.type === "updateNetworks") {
      updateAllNetworks();
    }
  };

  browser.runtime.onMessage.addListener(updateNetworksListener);

  onDestroy(() => {
    browser.runtime.onMessage.removeListener(updateNetworksListener);
  });

  const changeNetwork = (networkValue) => {
    const network = allNetworks.filter(
      (item) => item.server == networkValue
    )[0];
    networksStore.changeNetwork(network);
  };

  const addNewNetwork = () => {
    switchPage("AddNewNetwork");
  };
</script>

<style>
  :global(.network-dropdown) {
    margin-right: 10rem;
    margin-top: 0.5rem;
  }
  :global(.network-dropdown summary) {
    font-size: 1.5rem;
    width: 10rem;
    text-overflow: ellipsis;
    overflow: hidden;
    padding: 0.75rem;
    margin-top: 0.5rem;
    color: var(--color-black);
    display: initial;
  }
  :global(.network-dropdown .card) {
    padding: 0 !important;
  }
  :global(.network-dropdown .card .selected) {
    background-color: var(--color-primary) !important;
    color: var(--color-black) !important;
  }
  :global(.network-dropdown .card div) {
    padding: 0.5rem 2rem;
    cursor: pointer;
  }
</style>

<div class="flex-row network-dropdown">
  <Button dropdown={$currentNetwork.name} autoclose outline icon={mdiNetwork}>
    {#each allNetworks as network}
      <div
        on:click={(event) => changeNetwork(event.target.dataset.value)}
        class:selected={network.server == $currentNetwork.server}
        data-value={network.server}>
        {network.name}
      </div>
    {/each}
    <div on:click={() => addNewNetwork()}>
      <Icon src={mdiPlus} size="1.5" color="var(--color-black)" />
      {$_('Add')}
    </div>
  </Button>
</div>
